# markdpad

A fast, focused markdown viewer and editor for Windows. ~10MB MSIX, instant launch, GFM + math + mermaid + diagrams out of the box. No telemetry, no account.

## Why
Notepad can't render markdown. VS Code is overkill. Typora is $15. Most freemium markdown editors are sluggish Electron bundles. **markdpad** is built on Tauri 2 (Rust + native WebView2) so it launches in well under a second, weighs ~10 MB on disk, and feels like a native Windows app.

## Features
- **View / Edit toggle per file**, remembered. Existing files open in **view** mode by default; new files open in **edit** mode.
- **Multi-tab**, plus a collapsible sidebar listing every open file.
- **GitHub-flavored markdown**: tables, task lists, autolinks, anchors.
- **Math** via KaTeX. **Mermaid** diagrams. **Syntax-highlighted** code blocks (Shiki).
- **Drag-drop** any `.md` into the window to open it.
- **Light + dark** themes.
- **File association** for `.md`, `.markdown`, `.mdx`.

## Keyboard shortcuts
| Shortcut | Action |
|---|---|
| Ctrl+N | New file (opens in edit mode) |
| Ctrl+O | Open file… |
| Ctrl+S | Save |
| Ctrl+W | Close tab |
| Ctrl+E | Toggle view / edit |
| Ctrl+B | Toggle sidebar |
| Ctrl+Tab / Ctrl+Shift+Tab | Cycle tabs |
| Ctrl+1…9 | Jump to tab N |

## Development

### Prerequisites
- **Node 20+** and **pnpm**
- **Rust** stable toolchain (`rustup`)
- **Windows-side**: Microsoft Visual Studio C++ Build Tools and the WebView2 Runtime (preinstalled on Windows 11). See <https://v2.tauri.app/start/prerequisites/>.

### WSL ↔ Windows split
This repo lives in WSL. **`pnpm tauri dev` and `pnpm tauri build` must be run from native Windows** (PowerShell), because Tauri builds against WebView2 and the MSVC toolchain. Two options:

1. **Develop in WSL, build on Windows.** Edit code in WSL (VS Code Remote-WSL is great), then in PowerShell:
   ```powershell
   cd \\wsl$\Ubuntu\home\alex\markdpad
   pnpm install
   pnpm tauri dev
   ```
2. **Move the repo onto the Windows filesystem** for faster I/O:
   ```powershell
   git clone <remote> C:\src\markdpad
   cd C:\src\markdpad
   pnpm install
   pnpm tauri dev
   ```

### Frontend-only iteration
You can iterate the React UI in WSL with no Tauri runtime — `invoke()` calls will throw, but the editor and renderer work fine in a normal browser:
```bash
pnpm install
pnpm dev   # http://localhost:1420
```

### Production build
On Windows:
```powershell
pnpm tauri build
```
This produces an MSI and an NSIS installer in `src-tauri/target/release/bundle/`.

## Shipping to the Microsoft Store
1. Register a Microsoft Partner Center account ($19 individual, one-time).
2. Reserve the app name **markdpad** in Partner Center.
3. Switch the Tauri bundle target to `msix` and sign with the Store-issued certificate.
4. Submit via Partner Center; review usually completes in 1–3 days.

## Architecture
- `src-tauri/` — Rust + Tauri 2. Owns file I/O permissions, file associations, CLI argument handling, and the singleton bridge for "Open with markdpad".
- `src/` — React 19 + TypeScript + Vite. CodeMirror 6 for the editor, markdown-it (+ KaTeX, task lists, anchor) + Shiki + Mermaid for the renderer.
- Per-file view/edit mode and UI state are persisted via `tauri-plugin-store` in the OS app data directory.

## License
TBD.
