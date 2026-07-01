# markdpad

A fast, focused markdown viewer and editor for Windows. Built on Tauri 2 (Rust + native WebView2) — ~10 MB on disk, instant launch, no telemetry, no account required.

## Download

**[→ Download the latest installer](https://github.com/maco144/markdpad/releases/latest)**

Grab the `.exe` (recommended) or `.msi` from the release assets, run it, and you're done. Requires Windows 10 or later (WebView2 is pre-installed on Windows 11; Windows 10 will prompt to install it automatically).

## Why

Notepad can't render markdown. VS Code is overkill. Typora is $15. Most freemium markdown editors are sluggish Electron bundles. markdpad launches in well under a second and feels like a native Windows app.

## Features

- **View / Edit toggle per file**, remembered across sessions. Existing files open in view mode; new files open in edit mode.
- **Multi-tab** with a collapsible sidebar listing every open file.
- **GitHub-flavored markdown** — tables, task lists, autolinks, anchors.
- **Math** via KaTeX. **Diagrams** via Mermaid. **Syntax highlighting** via Shiki.
- **Drag and drop** any `.md` / `.markdown` / `.mdx` file into the window to open it.
- **File associations** — double-click a `.md` file in Explorer to open it directly.
- **Light and dark** themes.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+N | New file |
| Ctrl+O | Open file |
| Ctrl+S | Save |
| Ctrl+W | Close tab |
| Ctrl+E | Toggle view / edit |
| Ctrl+B | Toggle sidebar |
| Ctrl+Tab / Ctrl+Shift+Tab | Cycle tabs |
| Ctrl+1…9 | Jump to tab N |

## Building from source

Releases are built automatically via GitHub Actions on every version tag. To build locally you'll need a native Windows environment (not WSL) — Tauri targets WebView2 and the MSVC toolchain.

### Prerequisites

- [Node.js 22+](https://nodejs.org) and [pnpm](https://pnpm.io)
- [Rust stable](https://rustup.rs)
- [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (select "Desktop development with C++")
- WebView2 Runtime — pre-installed on Windows 11; auto-prompted on Windows 10

### Run in development

```powershell
git clone https://github.com/maco144/markdpad.git
cd markdpad
pnpm install
pnpm tauri dev
```

### Build an installer

```powershell
pnpm tauri build
```

Produces an NSIS `.exe` installer and an `.msi` in `src-tauri/target/release/bundle/`.

## Architecture

- `src-tauri/` — Rust + Tauri 2. File I/O, file associations, CLI argument handling, single-instance bridge.
- `src/` — React 19 + TypeScript + Vite. CodeMirror 6 for the editor; markdown-it + KaTeX + Mermaid + Shiki for the renderer.
- Per-file state is persisted via `tauri-plugin-store` in the OS app data directory.

## License

TBD.
