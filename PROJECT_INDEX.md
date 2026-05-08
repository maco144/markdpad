# Project Index: markdpad

A fast, focused markdown viewer and editor for Windows. Tauri 2 (Rust + WebView2) + React 19 + TypeScript + Vite + CodeMirror 6. Targeting Microsoft Store at $3.

> **What this file is for:** load this instead of grep/find/read across the repo. ~3KB index ≈ 94% token savings vs reading source. Refresh with `/sc:index-repo` when structure changes.

## Project Structure

```
markdpad/
├── src/                       React 19 + TS frontend (Vite)
│   ├── App.tsx                Top-level state, shortcuts, mode persistence
│   ├── main.tsx               React entrypoint + KaTeX CSS import
│   ├── components/            UI shell (7 files, ~520 lines)
│   ├── markdown.ts            markdown-it pipeline (KaTeX, Mermaid, Shiki)
│   ├── outline.ts             Heading parser + slug generator
│   ├── export.ts              HTML + PDF export pipeline
│   ├── store.ts               tauri-plugin-store wrapper (mode/theme/recent)
│   ├── types.ts               OpenFile, Mode, AppState
│   ├── shims.d.ts             markdown-it-task-lists ambient module
│   └── styles.css             All CSS (light/dark themes via [data-theme])
├── src-tauri/                 Rust + Tauri 2 backend
│   ├── src/lib.rs             File assoc, single-instance, plugin wiring
│   ├── src/main.rs            Window-subsystem entrypoint
│   ├── tauri.conf.json        Bundle config, file associations, MSI/NSIS
│   ├── capabilities/          Permissions (fs scope, dialog, opener, store)
│   ├── icons/                 Placeholder M icons (replace before Store)
│   └── Cargo.toml             Rust deps + release profile (lto, opt-s)
├── scripts/gen_icons.py       Stdlib PNG/ICO generator (placeholder icons)
├── README.md                  Build/run instructions, WSL↔Windows split
├── sample.md                  Smoke-test doc (GFM, math, mermaid, code)
├── package.json               pnpm workspace, Tauri scripts, all deps
├── vite.config.ts             Dev server port 1420, HMR for Tauri
└── tsconfig.json              Strict TS, ES2022, react-jsx
```

## Entry Points

- **CLI / desktop launch:** `src-tauri/src/main.rs` → `markdpad_lib::run()` in `src-tauri/src/lib.rs:62`
- **Frontend:** `index.html` → `src/main.tsx` → `src/App.tsx`
- **Production build:** `pnpm tauri build` → `.msi` + `.exe` in `src-tauri/target/release/bundle/`
- **Dev (Windows-only):** `pnpm tauri dev` (needs WebView2 + MSVC linker; see README WSL section)

## Core Modules

### `src/App.tsx` (443 lines)
Top-level. Holds `files: OpenFile[]`, `activeId`, `sidebarOpen`, `outlineOpen`, `theme`, `selection`, `recent`, `error`. Wires:
- `openPath(path)` — read file, restore last view/edit mode (existing → view, new → edit)
- `newFile()` — Untitled, edit mode
- `saveActive()` — Ctrl+S, prompts for path on first save
- `closeFile(id)` — confirms if dirty
- Global keyboard shortcuts (lines ~210–250): Ctrl+S/O/N/W/E/B, Ctrl+Tab, Ctrl+1–9
- Drag-drop via `getCurrentWebview().onDragDropEvent`
- File-association intake via `drain_pending_opens` invoke + `files-opened` event listener

### `src/components/`
| File | Purpose |
|---|---|
| `Editor.tsx` | CodeMirror 6 host. Markdown lang, search/replace (Ctrl+F/H), one-dark theme, exposes `EditorSelection`, accepts `scrollToLine` |
| `Preview.tsx` | Renders markdown via `renderMarkdown` + `postRender`. Intercepts link clicks: in-page → smooth scroll, http(s)/mailto → `openUrl` (opener plugin) |
| `Sidebar.tsx` | Left panel: open files list, New/Open buttons, collapsible (Ctrl+B) |
| `TabBar.tsx` | Top tabs with dirty marker (•) and × close |
| `Toolbar.tsx` | Mode segment toggle, Save, Export▾ menu (HTML/PDF), theme toggle |
| `Outline.tsx` | Right panel, auto-generated heading list, indent-by-level, click to jump |
| `StatusBar.tsx` | Bottom bar: mode, line:col (edit), word/char count, dirty/saved |

### `src/markdown.ts` (108 lines)
markdown-it pipeline with anchor (matches outline slugs), task-lists, KaTeX. Custom fence rule: mermaid blocks get a placeholder div, other languages get a `pre.shiki-pending`. `postRender(container, theme)` does Shiki + Mermaid passes async after `innerHTML` is set. `setMermaidTheme()` re-inits on theme switch.

### `src/outline.ts` (53 lines)
`parseOutline(source)` → `{level, text, slug, line}[]`. Skips fenced code blocks. Slug matches markdown-it-anchor's default (`encodeURIComponent(trim().lower().replace(/\s+/g, '-'))`) with `-N` suffix dedup so DOM ids align.

### `src/export.ts` (128 lines)
- `exportHtml(source, theme, name)` — saveDialog + standalone HTML w/ inlined CSS, KaTeX via jsDelivr CDN
- `exportPdf(source, theme, name)` — off-screen iframe + `iframe.contentWindow.print()` → user picks "Save as PDF"
- Shared `renderOffscreen()` and `buildStandaloneHtml()`

### `src/store.ts` (65 lines)
`LazyStore("markdpad-state.json")` wrapper. Keys: `mode:<path>`, `ui:theme`, `ui:sidebarOpen`, `ui:outlineOpen`, `ui:recentPaths`. Persisted in OS app data dir.

### `src-tauri/src/lib.rs` (99 lines)
- `extract_md_paths(args, cwd)` — filters CLI args by extension, resolves relative paths
- `drain_pending_opens` — Tauri command, returns + clears the initial-launch buffer
- `file_meta` — Tauri command (currently unused on frontend)
- Plugin order (single-instance MUST be first): single-instance → dialog → fs → store → opener
- Single-instance handler: focuses window, emits `files-opened` event with new args
- Setup hook: emits `files-opened` for initial CLI args (also drainable via `drain_pending_opens`)

## Configuration

| File | Purpose |
|---|---|
| `src-tauri/tauri.conf.json` | Window size, MSI/NSIS bundle targets, file associations for `.md`/`.markdown`/`.mdx`, identifier `com.markdpad.app` |
| `src-tauri/capabilities/default.json` | Plugin permissions; **fs scope is `"**"`** (required for opening files outside dialog) |
| `src-tauri/Cargo.toml` | Release profile: `lto`, `opt-level="s"`, `strip=true`, `codegen-units=1` |
| `package.json` | All pnpm deps; pinned tauri-plugin-* to `^2` |
| `vite.config.ts` | Dev port 1420, ignores `src-tauri/**` for HMR |
| `tsconfig.json` | Strict, ES2022, `react-jsx`, `noUnusedLocals` |

## Key Dependencies

| Package | Purpose |
|---|---|
| `tauri@2` + `tauri-plugin-{dialog,fs,store,opener,single-instance}` | Native shell, file IO, persistence, OS link opener, single-window enforcement |
| `react@19` + `react-dom@19` | UI |
| `@codemirror/{state,view,commands,language,lang-markdown,search,theme-one-dark}` | Editor |
| `markdown-it` + `markdown-it-{anchor,task-lists,katex}` | Renderer |
| `katex`, `mermaid`, `shiki` | Math, diagrams, code highlighting |
| `vite@6`, `typescript@5.7`, `@tauri-apps/cli@2` | Build tooling |

## Daily-driver setup

1. `pnpm install` (Windows-side, needs Node + pnpm via Corepack)
2. `pnpm tauri build` → `src-tauri/target/release/bundle/msi/markdpad_<v>_x64_en-US.msi`
3. Install `.msi` (SmartScreen warning expected — unsigned)
4. Right-click any `.md` → Open with → markdpad → "Always use this app"

## Quick reference: keyboard shortcuts

`Ctrl+N` new · `Ctrl+O` open · `Ctrl+S` save · `Ctrl+W` close tab · `Ctrl+E` toggle view/edit · `Ctrl+B` toggle sidebar · `Ctrl+Tab` cycle tabs · `Ctrl+1–9` jump to tab · `Ctrl+F` find · `Ctrl+H` replace

## Known gaps / next-up

- **Tests:** none yet (no `tests/`, no `*.test.*` files)
- **Real icon:** `src-tauri/icons/*` are placeholder solid-color M's from `scripts/gen_icons.py`
- **External-edit reload:** no fs-watcher; if file changes on disk while open, markdpad won't notice
- **Bundle size:** ~530KB gzipped main chunk (Mermaid + Shiki ship every variant); lazy-loading on the punch list
- **Code signing:** none; SmartScreen prompts on install. Required before public distribution
- **CI:** no GitHub Actions workflow yet for `.msi` builds

## Repository state

- **Branch:** `main`
- **Recent commits:**
  - `e1d782e` fix: open files from anywhere; surface fs errors visibly
  - `e357376` feat: single-instance — focus existing window and forward args
  - `a309590` feat: find/replace, external links, status bar, recent files, outline, export
  - `8c4429c` feat: initial markdpad scaffold
- **No remote configured.** GitHub Actions step (when ready) will need `git remote add origin <url>` first.
