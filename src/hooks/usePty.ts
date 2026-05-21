import type { Terminal } from "@xterm/xterm";
import { useCallback, useEffect } from "react";
import { spawn } from "tauri-pty";

interface PtySession {
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  kill: () => void;
  disposables: { dispose: () => void }[];
}

const PTY_SESSIONS = new Map<string, PtySession>();

export function killPtySession(terminalId: string) {
  const session = PTY_SESSIONS.get(terminalId);
  if (session) {
    for (const d of session.disposables) {
      d.dispose();
    }
    session.kill();
    PTY_SESSIONS.delete(terminalId);
  }
}

export function hasPtySession(terminalId: string): boolean {
  return PTY_SESSIONS.has(terminalId);
}

interface UsePtyOptions {
  cwd?: string;
  onExit?: (code: number) => void;
}

function isHangul(text: string): boolean {
  if (!text) {
    return false;
  }
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (
      (cp >= 0x11_00 && cp <= 0x11_ff) ||
      (cp >= 0x31_30 && cp <= 0x31_8f) ||
      (cp >= 0xac_00 && cp <= 0xd7_af)
    ) {
      return true;
    }
  }
  return false;
}

interface ImeKeyState {
  cleanupFns: (() => void)[];
  getReplacement: () => string;
  setReplacement: (v: string) => void;
}

function setupImeKeyHandler(term: Terminal): ImeKeyState {
  let lastKeydownWas229 = false;
  let lastReplacement = "";

  term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
    if (event.type === "keydown") {
      if (event.keyCode === 229) {
        lastKeydownWas229 = true;
        return false;
      }
      lastKeydownWas229 = false;
    }
    if (event.type === "keypress" && lastKeydownWas229) {
      return false;
    }
    return true;
  });

  return {
    cleanupFns: [],
    getReplacement: () => lastReplacement,
    setReplacement: (v) => {
      lastReplacement = v;
    },
  };
}

function setupImeInputHandler(
  term: Terminal,
  ptyWrite: (data: string) => void,
  imeKeyState: ImeKeyState,
): () => void {
  const xtermEl = term.element;
  if (!xtermEl) {
    return () => {};
  }

  const onInput = (ev: Event) => {
    const e = ev as InputEvent;

    if (e.inputType !== "insertReplacementText") {
      imeKeyState.setReplacement("");
      return;
    }

    if (!(e.data && isHangul(e.data))) {
      return;
    }

    if (e.data === imeKeyState.getReplacement()) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }

    imeKeyState.setReplacement(e.data);
    e.stopImmediatePropagation();
    e.preventDefault();
    ptyWrite(`\x7f${e.data}`);
  };

  xtermEl.addEventListener("input", onInput, true);
  return () => xtermEl.removeEventListener("input", onInput, true);
}

function connectPty(
  term: Terminal,
  pty: Awaited<ReturnType<typeof spawn>>,
  terminalId: string,
  onExit?: (code: number) => void,
): PtySession {
  const dataDisp = term.onData((data) => pty.write(data));
  const resizeDisp = term.onResize(({ cols: newCols, rows: newRows }) =>
    pty.resize(newCols, newRows),
  );

  pty.onData((data: Uint8Array) => term.write(new Uint8Array(data)));

  const imeKeyState = setupImeKeyHandler(term);
  const imeCleanup = setupImeInputHandler(term, (d) => pty.write(d), imeKeyState);

  pty.onExit(({ exitCode }: { exitCode: number }) => {
    PTY_SESSIONS.delete(terminalId);
    try {
      term.write(`\r\n\x1b[90m[Process exited: ${exitCode}]\x1b[0m`);
    } catch {}
    onExit?.(exitCode);
  });

  return {
    write: (data: string) => pty.write(data),
    resize: (c: number, r: number) => pty.resize(c, r),
    kill: () => pty.kill(),
    disposables: [
      dataDisp,
      resizeDisp,
      { dispose: imeCleanup },
      ...imeKeyState.cleanupFns.map((fn) => ({ dispose: fn })),
    ],
  };
}

export function usePty(terminalId: string, { cwd, onExit }: UsePtyOptions) {
  const spawnPty = useCallback(
    async (term: Terminal, cols: number, rows: number) => {
      if (PTY_SESSIONS.has(terminalId)) {
        return;
      }

      try {
        const pty = await spawn("/bin/zsh", ["-l"], {
          cols,
          rows,
          cwd: cwd || undefined,
          env: { TERM: "xterm-256color", COLORTERM: "truecolor" },
        });
        PTY_SESSIONS.set(terminalId, connectPty(term, pty, terminalId, onExit));
      } catch (e) {
        term.write(`\r\n\x1b[31mFailed to spawn shell: ${e}\x1b[0m`);
      }
    },
    [terminalId, cwd, onExit],
  );

  useEffect(
    () => () => {
      const id = terminalId;
      setTimeout(() => killPtySession(id), 300);
    },
    [terminalId],
  );

  return { spawnPty };
}
