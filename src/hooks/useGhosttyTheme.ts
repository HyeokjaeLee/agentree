import { useEffect, useState } from "react";
import { type GhosttyConfig, getGhosttyConfig } from "@/lib/invoke";

interface TerminalTheme {
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

const DEFAULT_THEME: TerminalTheme = {
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

const PALETTE_KEYS: Array<{ ghostty: string; theme: keyof TerminalTheme }> = [
  { ghostty: "black", theme: "black" },
  { ghostty: "red", theme: "red" },
  { ghostty: "green", theme: "green" },
  { ghostty: "yellow", theme: "yellow" },
  { ghostty: "blue", theme: "blue" },
  { ghostty: "magenta", theme: "magenta" },
  { ghostty: "cyan", theme: "cyan" },
  { ghostty: "white", theme: "white" },
  { ghostty: "bright_black", theme: "brightBlack" },
  { ghostty: "bright_red", theme: "brightRed" },
  { ghostty: "bright_green", theme: "brightGreen" },
  { ghostty: "bright_yellow", theme: "brightYellow" },
  { ghostty: "bright_blue", theme: "brightBlue" },
  { ghostty: "bright_magenta", theme: "brightMagenta" },
  { ghostty: "bright_cyan", theme: "brightCyan" },
  { ghostty: "bright_white", theme: "brightWhite" },
];

function resolvePalette(palette: Record<string, string>): Partial<TerminalTheme> {
  const colors: Partial<TerminalTheme> = {};
  for (const { ghostty, theme } of PALETTE_KEYS) {
    const value = palette[ghostty];
    if (value) {
      colors[theme] = value;
    }
  }
  return colors;
}

function ghosttyToTheme(cfg: GhosttyConfig): TerminalTheme {
  return {
    ...DEFAULT_THEME,
    ...resolvePalette(cfg.palette),
    background: cfg.background,
    foreground: cfg.foreground,
    cursor: cfg.foreground,
    cursorAccent: cfg.background,
    selectionBackground: `${cfg.foreground}40`,
  };
}

export function useGhosttyTheme() {
  const [theme, setTheme] = useState<TerminalTheme>(DEFAULT_THEME);
  const [fontFamily, setFontFamily] = useState("'Goorm Sans Code', monospace");
  const [fontSize, setFontSize] = useState(14);

  useEffect(() => {
    getGhosttyConfig()
      .then((cfg) => {
        setTheme(ghosttyToTheme(cfg));
        setFontFamily(`'${cfg.font_family}', monospace`);
        setFontSize(cfg.font_size);
      })
      .catch(() => {});
  }, []);

  return { theme, fontFamily, fontSize };
}
