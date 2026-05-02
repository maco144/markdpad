import { useCallback, useEffect, useRef, useState } from "react";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile, exists } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";

import { Sidebar } from "./components/Sidebar";
import { TabBar } from "./components/TabBar";
import { Toolbar } from "./components/Toolbar";
import { Editor } from "./components/Editor";
import { Preview } from "./components/Preview";

import {
  loadFileMode,
  saveFileMode,
  loadTheme,
  saveTheme,
  loadSidebarOpen,
  saveSidebarOpen,
  pushRecent,
} from "./store";
import { setMermaidTheme } from "./markdown";
import type { Mode, OpenFile } from "./types";

let idCounter = 0;
const nextId = () => `f${++idCounter}-${Date.now().toString(36)}`;

function basename(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

export default function App() {
  const [files, setFiles] = useState<OpenFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const filesRef = useRef(files);
  filesRef.current = files;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const active = files.find((f) => f.id === activeId) ?? null;

  // Initial load: theme, sidebar, plus any files passed via CLI / file association.
  useEffect(() => {
    (async () => {
      const [t, sb] = await Promise.all([loadTheme(), loadSidebarOpen()]);
      setTheme(t);
      setSidebarOpen(sb);
      setMermaidTheme(t);
      try {
        const pending = await invoke<string[]>("drain_pending_opens");
        for (const p of pending) await openPath(p);
      } catch {
        /* noop */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for OS-level file-open events (from Tauri singleton / file association).
  useEffect(() => {
    const unlisten = listen<string[]>("files-opened", (e) => {
      for (const p of e.payload) void openPath(p);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for drag-drop into the window.
  useEffect(() => {
    const wv = getCurrentWebview();
    const unlisten = wv.onDragDropEvent((event) => {
      if (event.payload.type === "drop") {
        for (const p of event.payload.paths) void openPath(p);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Apply theme + persist
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    setMermaidTheme(theme);
    void saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    void saveSidebarOpen(sidebarOpen);
  }, [sidebarOpen]);

  const openPath = useCallback(async (path: string) => {
    // If already open, just focus it.
    const existing = filesRef.current.find((f) => f.path === path);
    if (existing) {
      setActiveId(existing.id);
      return;
    }
    const ok = await exists(path).catch(() => false);
    if (!ok) return;
    const content = await readTextFile(path);
    const savedMode = await loadFileMode(path);
    const mode: Mode = savedMode ?? "view"; // existing files default to view
    const file: OpenFile = {
      id: nextId(),
      path,
      name: basename(path),
      content,
      savedContent: content,
      mode,
      isNew: false,
    };
    setFiles((prev) => [...prev, file]);
    setActiveId(file.id);
    void pushRecent(path);
  }, []);

  const newFile = useCallback(() => {
    const file: OpenFile = {
      id: nextId(),
      path: null,
      name: "Untitled.md",
      content: "",
      savedContent: "",
      mode: "edit", // new files default to edit
      isNew: true,
    };
    setFiles((prev) => [...prev, file]);
    setActiveId(file.id);
  }, []);

  const openDialogAndLoad = useCallback(async () => {
    const selected = await openDialog({
      multiple: true,
      filters: [{ name: "Markdown", extensions: ["md", "markdown", "mdx", "txt"] }],
    });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    for (const p of paths) await openPath(p);
  }, [openPath]);

  const saveActive = useCallback(async () => {
    const cur = filesRef.current.find((f) => f.id === activeIdRef.current);
    if (!cur) return;
    let path = cur.path;
    if (!path) {
      const picked = await saveDialog({
        defaultPath: cur.name,
        filters: [{ name: "Markdown", extensions: ["md", "markdown", "mdx"] }],
      });
      if (!picked) return;
      path = picked;
    }
    await writeTextFile(path, cur.content);
    setFiles((prev) =>
      prev.map((f) =>
        f.id === cur.id
          ? {
              ...f,
              path: path!,
              name: basename(path!),
              savedContent: f.content,
              isNew: false,
            }
          : f
      )
    );
    void pushRecent(path);
    void saveFileMode(path, cur.mode);
  }, []);

  const closeFile = useCallback(
    (id: string) => {
      const target = filesRef.current.find((f) => f.id === id);
      if (!target) return;
      const dirty = target.content !== target.savedContent;
      if (dirty) {
        const ok = window.confirm(`${target.name} has unsaved changes. Close anyway?`);
        if (!ok) return;
      }
      setFiles((prev) => {
        const next = prev.filter((f) => f.id !== id);
        if (activeIdRef.current === id) {
          const idx = prev.findIndex((f) => f.id === id);
          const fallback = next[idx] ?? next[idx - 1] ?? next[0] ?? null;
          setActiveId(fallback ? fallback.id : null);
        }
        return next;
      });
    },
    []
  );

  const setMode = useCallback((id: string, mode: Mode) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        if (f.path) void saveFileMode(f.path, mode);
        return { ...f, mode };
      })
    );
  }, []);

  const onContentChange = useCallback((id: string, content: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, content } : f))
    );
  }, []);

  const cycleTab = useCallback((dir: 1 | -1) => {
    const list = filesRef.current;
    if (list.length === 0) return;
    const cur = list.findIndex((f) => f.id === activeIdRef.current);
    const idx = cur === -1 ? 0 : (cur + dir + list.length) % list.length;
    setActiveId(list[idx].id);
  }, []);

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        void saveActive();
      } else if (key === "o") {
        e.preventDefault();
        void openDialogAndLoad();
      } else if (key === "n") {
        e.preventDefault();
        newFile();
      } else if (key === "w") {
        e.preventDefault();
        if (activeIdRef.current) closeFile(activeIdRef.current);
      } else if (key === "e") {
        e.preventDefault();
        const cur = filesRef.current.find((f) => f.id === activeIdRef.current);
        if (cur) setMode(cur.id, cur.mode === "view" ? "edit" : "view");
      } else if (key === "b") {
        e.preventDefault();
        setSidebarOpen((v) => !v);
      } else if (key === "tab") {
        e.preventDefault();
        cycleTab(e.shiftKey ? -1 : 1);
      } else if (/^[1-9]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        const list = filesRef.current;
        if (idx < list.length) {
          e.preventDefault();
          setActiveId(list[idx].id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveActive, openDialogAndLoad, newFile, closeFile, setMode, cycleTab]);

  return (
    <div className="app">
      <Sidebar
        files={files}
        activeId={activeId}
        open={sidebarOpen}
        onSelect={setActiveId}
        onClose={closeFile}
        onToggle={() => setSidebarOpen((v) => !v)}
        onNew={newFile}
        onOpen={openDialogAndLoad}
      />
      <main className="main">
        <Toolbar
          active={active}
          theme={theme}
          onModeChange={(m) => active && setMode(active.id, m)}
          onSave={saveActive}
          onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        />
        <TabBar
          files={files}
          activeId={activeId}
          onSelect={setActiveId}
          onClose={closeFile}
        />
        <div className="workspace">
          {!active && (
            <div className="empty-state">
              <h1>markdpad</h1>
              <p>A fast, focused markdown viewer and editor.</p>
              <div className="empty-actions">
                <button type="button" className="action" onClick={newFile}>
                  New file (Ctrl+N)
                </button>
                <button type="button" className="action" onClick={openDialogAndLoad}>
                  Open file… (Ctrl+O)
                </button>
              </div>
              <p className="hint">Drop a .md file anywhere in this window to open it.</p>
            </div>
          )}
          {active && active.mode === "edit" && (
            <Editor
              key={active.id}
              value={active.content}
              onChange={(v) => onContentChange(active.id, v)}
              theme={theme}
            />
          )}
          {active && active.mode === "view" && (
            <Preview source={active.content} theme={theme} />
          )}
        </div>
      </main>
    </div>
  );
}
