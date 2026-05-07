import { useCallback, useEffect, useRef, useState } from "react";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile, exists } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";

import { Sidebar } from "./components/Sidebar";
import { TabBar } from "./components/TabBar";
import { Toolbar } from "./components/Toolbar";
import { Editor, type EditorSelection } from "./components/Editor";
import { Preview } from "./components/Preview";
import { StatusBar } from "./components/StatusBar";
import { Outline } from "./components/Outline";

import {
  loadFileMode,
  saveFileMode,
  loadTheme,
  saveTheme,
  loadSidebarOpen,
  saveSidebarOpen,
  loadOutlineOpen,
  saveOutlineOpen,
  pushRecent,
  loadRecent,
  removeRecent,
} from "./store";
import { setMermaidTheme } from "./markdown";
import { exportHtml, exportPdf } from "./export";
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
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [selection, setSelection] = useState<EditorSelection | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [scrollSlug, setScrollSlug] = useState<string | null>(null);
  const [scrollLine, setScrollLine] = useState<number | null>(null);

  const filesRef = useRef(files);
  filesRef.current = files;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const active = files.find((f) => f.id === activeId) ?? null;

  // Initial load: theme, sidebar, plus any files passed via CLI / file association.
  useEffect(() => {
    (async () => {
      const [t, sb, ol, r] = await Promise.all([
        loadTheme(),
        loadSidebarOpen(),
        loadOutlineOpen(),
        loadRecent(),
      ]);
      setTheme(t);
      setSidebarOpen(sb);
      setOutlineOpen(ol);
      setRecent(r);
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

  useEffect(() => {
    void saveOutlineOpen(outlineOpen);
  }, [outlineOpen]);

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
    void pushRecent(path).then(() => loadRecent().then(setRecent));
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
    void pushRecent(path).then(() => loadRecent().then(setRecent));
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
          onExportHtml={() =>
            active && void exportHtml(active.content, theme, active.name).catch(() => {})
          }
          onExportPdf={() =>
            active && void exportPdf(active.content, theme, active.name).catch(() => {})
          }
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
              {recent.length > 0 && (
                <div className="recent-list">
                  <h2>Recent</h2>
                  <ul>
                    {recent.slice(0, 10).map((p) => (
                      <li key={p}>
                        <button
                          type="button"
                          className="recent-item"
                          onClick={() => void openPath(p)}
                          title={p}
                        >
                          <span className="recent-name">{basename(p)}</span>
                          <span className="recent-path">{p}</span>
                        </button>
                        <button
                          type="button"
                          className="recent-remove"
                          aria-label={`Remove ${basename(p)} from recent`}
                          onClick={(e) => {
                            e.stopPropagation();
                            void removeRecent(p).then(() => loadRecent().then(setRecent));
                          }}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="hint">Drop a .md file anywhere in this window to open it.</p>
            </div>
          )}
          {active && active.mode === "edit" && (
            <>
              <Editor
                key={active.id}
                value={active.content}
                onChange={(v) => onContentChange(active.id, v)}
                onSelectionChange={setSelection}
                theme={theme}
                scrollToLine={scrollLine}
              />
              <button
                type="button"
                className="float-toggle"
                onClick={() => setMode(active.id, "view")}
                title="Switch to view mode (Ctrl+E)"
              >
                View
              </button>
            </>
          )}
          {active && active.mode === "view" && (
            <>
              <Preview source={active.content} theme={theme} scrollTo={scrollSlug} />
              <button
                type="button"
                className="float-toggle"
                onClick={() => setMode(active.id, "edit")}
                title="Switch to edit mode (Ctrl+E)"
              >
                Edit
              </button>
            </>
          )}
        </div>
        <StatusBar active={active} selection={active?.mode === "edit" ? selection : null} />
      </main>
      <Outline
        source={active?.content ?? ""}
        open={outlineOpen}
        onToggle={() => setOutlineOpen((v) => !v)}
        onJump={(item) => {
          if (!active) return;
          if (active.mode === "view") {
            // Re-set with a unique sentinel so Preview re-runs even on the same slug.
            setScrollSlug(null);
            setTimeout(() => setScrollSlug(item.slug), 0);
          } else {
            setScrollLine(null);
            setTimeout(() => setScrollLine(item.line), 0);
          }
        }}
      />
    </div>
  );
}
