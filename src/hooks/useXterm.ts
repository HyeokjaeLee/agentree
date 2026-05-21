import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal } from "@xterm/xterm";
import { useCallback, useEffect, useMemo, useRef } from "react";
import "@xterm/xterm/css/xterm.css";

export interface XtermTheme {
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

const DEFAULT_XTERM_THEME: XtermTheme = {
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

function createTerminal(
  container: HTMLDivElement,
  theme: XtermTheme,
  fontFamily: string,
  fontSize: number,
): { term: Terminal; fitAddon: FitAddon; cleanup: () => void } {
  const term = new Terminal({
    fontFamily,
    fontSize,
    lineHeight: 1.15,
    cursorBlink: true,
    cursorStyle: "bar",
    theme,
    allowProposedApi: true,
    scrollback: 10_000,
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
  } catch {}

  fitAddon.fit();

  const observer = new ResizeObserver(() => {
    try {
      fitAddon.fit();
    } catch (_e) {
      void _e;
    }
  });
  observer.observe(container);

  return {
    term,
    fitAddon,
    cleanup: () => {
      observer.disconnect();
      term.dispose();
    },
  };
}

export function useXterm({ theme, fontFamily, fontSize }: UseXtermOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const defaultTheme = useMemo(() => DEFAULT_XTERM_THEME, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const { term, fitAddon, cleanup } = createTerminal(
      container,
      theme ?? defaultTheme,
      fontFamily ?? "'Goorm Sans Code', 'Courier New', monospace",
      fontSize ?? 13,
    );

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    return () => {
      cleanup();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [theme, fontSize, fontFamily, defaultTheme]);

  const fit = useCallback(() => {
    try {
      fitAddonRef.current?.fit();
    } catch (_e) {
      void _e;
    }
  }, []);

  return { containerRef, terminal: termRef, fit };
}
