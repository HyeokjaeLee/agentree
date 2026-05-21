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

        // ── WKWebView (Tauri macOS) Korean IME fix ──
        // Requires _keyDownSeen patch on @xterm/xterm (see patches/@xterm+xterm+5.5.0.patch).
        //
        // Strategy: let xterm.js handle insertText naturally (sends to PTY via _inputEvent).
        // Only intercept insertReplacementText — which xterm.js ignores — by sending
        // backspace+new-char to PTY. This gives real-time composition display with zero delay.
        //
        // 1. Block keydown 229 → _keyDownSeen stays false → _inputEvent processes insertText
        // 2. Block keypress after keydown 229 → prevent double-send via keypress path
        // 3. insertReplacementText with Hangul → pty.write(VERASE + data) for instant update
        const imeCleanupFns: (() => void)[] = [];

        const isHangul = (text: string): boolean => {
          if (!text) return false;
          for (const ch of text) {
            const cp = ch.codePointAt(0)!;
            if (
              (cp >= 0x1100 && cp <= 0x11FF) ||
              (cp >= 0x3130 && cp <= 0x318F) ||
              (cp >= 0xAC00 && cp <= 0xD7AF)
            ) return true;
          }
          return false;
        };

        let lastKeydownWas229 = false;
        let lastReplacement = '';

        term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
          if (event.type === 'keydown') {
            if (event.keyCode === 229) {
              lastKeydownWas229 = true;
              return false;
            }
            lastKeydownWas229 = false;
          }
          if (event.type === 'keypress' && lastKeydownWas229) {
            return false;
          }
          return true;
        });

        const xtermEl = term.element;
        if (xtermEl) {
          const onInput = (ev: Event) => {
            const e = ev as InputEvent;

            if (e.inputType !== 'insertReplacementText') {
              lastReplacement = '';
              return;
            }

            if (!e.data || !isHangul(e.data)) return;

            if (e.data === lastReplacement) {
              e.stopImmediatePropagation();
              e.preventDefault();
              return;
            }

            lastReplacement = e.data;
            e.stopImmediatePropagation();
            e.preventDefault();
            pty.write(`\x7f${e.data}`);
          };

          xtermEl.addEventListener('input', onInput, true);

          imeCleanupFns.push(() => {
            xtermEl.removeEventListener('input', onInput, true);
          });
        }

        pty.onExit(({ exitCode }: { exitCode: number }) => {
          PTY_SESSIONS.delete(terminalId);
          try { term.write(`\r\n\x1b[90m[Process exited: ${exitCode}]\x1b[0m`); } catch {}
          onExit?.(exitCode);
        });

        PTY_SESSIONS.set(terminalId, {
          write: (data: string) => pty.write(data),
          resize: (c: number, r: number) => pty.resize(c, r),
          kill: () => pty.kill(),
          disposables: [dataDisp, resizeDisp, ...imeCleanupFns.map(fn => ({ dispose: fn }))],
        });
      } catch (e) {
        term.write(`\r\n\x1b[31mFailed to spawn shell: ${e}\x1b[0m`);
      }
    },
    [terminalId, cwd, onExit]
  );

  useEffect(() => {
    return () => {
      const id = terminalId;
      setTimeout(() => killPtySession(id), 300);
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
