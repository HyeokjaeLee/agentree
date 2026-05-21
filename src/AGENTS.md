# Frontend (src/)

## KEY DATA FLOWS

```
AppShell mount → loadFromStorage() (Tauri backend) → useProjectStore hydrated
               → startPolling() (5s interval) → useNotificationStore
Sidebar click → useProjectStore.setSelectedProject() → TerminalView re-renders
Git action → invoke.ts wrapper → Rust command → service → response → store update
```

## MANDATORY: BIOME CHECK AFTER CODE CHANGES

Any code modification in `src/` MUST be followed by:

```bash
bun run lint          # biome check (lint + format + imports)
bun run format:check  # format verification only
```

Both must pass with 0 errors and 0 warnings before committing. Fix issues with:

```bash
bun run lint:fix      # apply safe + unsafe auto-fixes
bun run format        # auto-format all files
```

## GOTCHAS

- Two persistence targets: Tauri backend file (project data) vs localStorage (UI state) — don't mix
- Notification polling is `setInterval(5000)` — no Tauri events/channels
- xterm.js addons (fit, search, web-links, webgl) configured in `useXterm.ts`
- Sidebar components split into `src/components/sidebar/` — each in its own file
- Project store split into `src/stores/projectStore*.ts` — types, actions, terminal logic separate
