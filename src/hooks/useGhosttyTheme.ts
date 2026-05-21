import { useState, useEffect } from "react";
import { getGhosttyConfig, type GhosttyConfig } from "@/lib/invoke";

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

function ghosttyToTheme(cfg: GhosttyConfig): TerminalTheme {
  const p = cfg.palette;
  return {
    background: cfg.background,
    foreground: cfg.foreground,
    cursor: cfg.foreground,
    cursorAccent: cfg.background,
    selectionBackground: `${cfg.foreground}40`,
    black: p["black"] ?? DEFAULT_THEME.black,
    red: p["red"] ?? DEFAULT_THEME.red,
    green: p["green"] ?? DEFAULT_THEME.green,
    yellow: p["yellow"] ?? DEFAULT_THEME.yellow,
    blue: p["blue"] ?? DEFAULT_THEME.blue,
    magenta: p["magenta"] ?? DEFAULT_THEME.magenta,
    cyan: p["cyan"] ?? DEFAULT_THEME.cyan,
    white: p["white"] ?? DEFAULT_THEME.white,
    brightBlack: p["bright_black"] ?? DEFAULT_THEME.brightBlack,
    brightRed: p["bright_red"] ?? DEFAULT_THEME.brightRed,
    brightGreen: p["bright_green"] ?? DEFAULT_THEME.brightGreen,
    brightYellow: p["bright_yellow"] ?? DEFAULT_THEME.brightYellow,
    brightBlue: p["bright_blue"] ?? DEFAULT_THEME.brightBlue,
    brightMagenta: p["bright_magenta"] ?? DEFAULT_THEME.brightMagenta,
    brightCyan: p["bright_cyan"] ?? DEFAULT_THEME.brightCyan,
    brightWhite: p["bright_white"] ?? DEFAULT_THEME.brightWhite,
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
