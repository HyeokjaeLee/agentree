import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import { spawn } from "tauri-pty";
import "@xterm/xterm/css/xterm.css";

interface PtySession {
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  kill: () => void;
  disposables: { dispose(): void }[];
}

const PTY_SESSIONS = new Map<string, PtySession>();

export function killPtySession(terminalId: string) {
  const session = PTY_SESSIONS.get(terminalId);
  if (session) {
    session.disposables.forEach((d) => d.dispose());
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

export function usePty(terminalId: string, { cwd, onExit }: UsePtyOptions) {
  const spawnPty = useCallback(
    async (term: Terminal, cols: number, rows: number) => {
      if (PTY_SESSIONS.has(terminalId)) return;

      try {
        const pty = await spawn("/bin/zsh", ["-l"], {
          cols,
          rows,
          cwd: cwd || undefined,
          env: { TERM: "xterm-256color", COLORTERM: "truecolor" },
        });

        const dataDisp = term.onData((data) => pty.write(data));
        const resizeDisp = term.onResize(({ cols, rows }) => pty.resize(cols, rows));

        pty.onData((data: Uint8Array) => term.write(new Uint8Array(data)));

        pty.onExit(({ exitCode }: { exitCode: number }) => {
          term.write(`\r\n\x1b[90m[Process exited: ${exitCode}]\x1b[0m`);
          PTY_SESSIONS.delete(terminalId);
          onExit?.(exitCode);
        });

        PTY_SESSIONS.set(terminalId, {
          write: (data: string) => pty.write(data),
          resize: (c: number, r: number) => pty.resize(c, r),
          kill: () => pty.kill(),
          disposables: [dataDisp, resizeDisp],
        });
      } catch (e) {
        term.write(`\r\n\x1b[31mFailed to spawn shell: ${e}\x1b[0m`);
      }
    },
    [terminalId, cwd, onExit]
  );

  useEffect(() => {
    return () => {
      killPtySession(terminalId);
    };
  }, [terminalId]);

  return { spawnPty };
}

interface XtermTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

interface UseXtermOptions {
  theme?: XtermTheme;
  fontFamily?: string;
  fontSize?: number;
}

export function useXterm({ theme, fontFamily, fontSize }: UseXtermOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const defaultTheme: XtermTheme = {
    background: "#0b0e11",
    foreground: "#eaecef",
    cursor: "#fcd535",
    cursorAccent: "#0b0e11",
    selectionBackground: "rgba(252, 213, 53, 0.25)",
    black: "#0b0e11",
    red: "#f6465d",
    green: "#0ecb81",
    yellow: "#fcd535",
    blue: "#3b82f6",
    magenta: "#2dbdb6",
    cyan: "#2dbdb6",
    white: "#eaecef",
    brightBlack: "#707a8a",
    brightRed: "#f6465d",
    brightGreen: "#0ecb81",
    brightYellow: "#fcd535",
    brightBlue: "#3b82f6",
    brightMagenta: "#2dbdb6",
    brightCyan: "#2dbdb6",
    brightWhite: "#eaecef",
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new Terminal({
      fontFamily: fontFamily ?? "'Goorm Sans Code', 'Courier New', monospace",
      fontSize: fontSize ?? 13,
      lineHeight: 1.15,
      cursorBlink: true,
      cursorStyle: "bar",
      theme: theme ?? defaultTheme,
      allowProposedApi: true,
      scrollback: 10000,
      allowTransparency: false,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(container);

    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => webglAddon.dispose());
      term.loadAddon(webglAddon);
    } catch {
    }

    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    const observer = new ResizeObserver(() => {
      try { fitAddon.fit(); } catch (_e) { void _e; }
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  const fit = useCallback(() => {
    try { fitAddonRef.current?.fit(); } catch (_e) { void _e; }
  }, []);

  return { containerRef, terminal: termRef, fit };
}
