# PROJECT KNOWLEDGE BASE

**Updated:** 2026-05-21
**Commit:** 0f7a72d
**Branch:** main

## OVERVIEW

Agentree — lightweight agent terminal. Tauri v2 desktop app: Git worktree/branch management + PTY terminal. React 19 + TypeScript + Zustand + xterm.js + Tailwind v4 frontend; Rust + Tauri v2 + tokio backend.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add Tauri command | `src-tauri/src/commands/` → register in `lib.rs` → add wrapper in `src/lib/invoke.ts` | 3-file touch pattern |
| Frontend state | `src/stores/useProjectStore.ts` | Central store, persists to Tauri backend (not localStorage) |
| UI chrome state | `src/stores/useUIStore.ts` | Persists to localStorage (not Tauri backend) |
| Terminal | `src/components/terminal/TerminalView.tsx` + `src/hooks/usePty.ts` | xterm.js + tauri-pty |
| App init | `src/components/layout/AppShell.tsx` | loadFromStorage + startPolling on mount |
| Git ops (Rust) | `src-tauri/src/services/git.rs` | `Command::new("git")` — no git2 crate |
| Design tokens / theme | `src/index.css` | Tailwind v4 CSS-first config, `--binance-*` tokens |
| Ghostty FFI | `src-tauri/src/ghostty/` | Gated behind `ghostty-link` Cargo feature |

## CONVENTIONS

- **`@/` imports** — maps to `src/` (tsconfig paths alias)
- **Tauri IPC** — all calls go through typed wrappers in `src/lib/invoke.ts`; never call `invoke()` directly
- **Two persistence targets** — `useProjectStore` → Tauri backend file; `useUIStore` → localStorage. Don't mix.
- **Tailwind v4** — config lives in `src/index.css` (`@theme inline {}`), no `tailwind.config.js`
- **Rust layering** — commands/ = thin IPC wrappers; services/ = business logic; models/ = data structs
- **No router** — single-window SPA, navigation driven by Zustand store state

## ANTI-PATTERNS

- Only one brand color: `--colors.primary` (yellow). No second brand color.
- Yellow = accent only. Never for body text or large surface fills.
- `--trading-up`/`--trading-down` = price-direction signals only. Never as card backgrounds.
- Display weight ≥ 700. Don't soften for hero/display roles.
- No atmospheric gradients (mesh, aurora, glow).
- Primary button = black text on yellow. Don't invert.
- `main.rs` Windows console suppression comment — DO NOT REMOVE.
- `ghostty/ffi.rs` = `unsafe` FFI. Don't modify without `// SAFETY:` docs.
- CSP is `null` — not production-safe for external exposure.

## GOTCHAS

- xterm.js patched via `patch-package` (minified diff). Version bumps may break. See `patches/@xterm+xterm+5.5.0.patch`.
- `usePty.ts` has Korean IME workaround for macOS WKWebView — don't remove the keydown-229 / insertReplacementText interception.
- `Sparkle.dylib` bundled for auto-updates — not Tauri's built-in updater.
- `src-tauri/gen/` = Tauri codegen output. Don't edit.
- No CI/CD. All builds manual/local.

## COMMANDS

```bash
bun run tauri dev            # Dev mode (HMR + Rust rebuild)
bun run build                # tsc -b && vite build (frontend only)
bun run tauri build          # Production: TS check → Vite → Cargo → bundle
cd src-tauri && cargo test   # 17 Rust unit tests (services/ only)
bun install                  # Runs patch-package automatically
```
