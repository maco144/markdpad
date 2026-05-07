import { useState, useEffect, useRef } from "react";
import type { Mode, OpenFile } from "../types";

interface Props {
  active: OpenFile | null;
  theme: "light" | "dark";
  onModeChange: (mode: Mode) => void;
  onSave: () => void;
  onToggleTheme: () => void;
  onExportHtml: () => void;
  onExportPdf: () => void;
}

export function Toolbar({
  active,
  theme,
  onModeChange,
  onSave,
  onToggleTheme,
  onExportHtml,
  onExportPdf,
}: Props) {
  const [exportOpen, setExportOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!exportOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setExportOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [exportOpen]);

  const mode: Mode = active?.mode ?? "view";
  const dirty = active ? active.content !== active.savedContent : false;
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <span className="active-name">
          {active ? active.name : "markdpad"}
          {dirty ? " •" : ""}
        </span>
      </div>
      <div className="toolbar-right">
        {active && (
          <>
            <div className="mode-toggle" role="tablist" aria-label="View or edit mode">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "view"}
                className={mode === "view" ? "mode-btn mode-btn-active" : "mode-btn"}
                onClick={() => onModeChange("view")}
                title="View mode (Ctrl+E to toggle)"
              >
                View
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "edit"}
                className={mode === "edit" ? "mode-btn mode-btn-active" : "mode-btn"}
                onClick={() => onModeChange("edit")}
                title="Edit mode (Ctrl+E to toggle)"
              >
                Edit
              </button>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={onSave}
              title="Save (Ctrl+S)"
              aria-label="Save"
              disabled={!dirty}
            >
              Save
            </button>
            <div className="menu-host" ref={menuRef}>
              <button
                type="button"
                className="icon-button"
                onClick={() => setExportOpen((v) => !v)}
                title="Export"
                aria-haspopup="menu"
                aria-expanded={exportOpen}
              >
                Export ▾
              </button>
              {exportOpen && (
                <div className="menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="menu-item"
                    onClick={() => {
                      setExportOpen(false);
                      onExportHtml();
                    }}
                  >
                    HTML…
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="menu-item"
                    onClick={() => {
                      setExportOpen(false);
                      onExportPdf();
                    }}
                  >
                    PDF…
                  </button>
                </div>
              )}
            </div>
          </>
        )}
        <button
          type="button"
          className="icon-button"
          onClick={onToggleTheme}
          title="Toggle theme"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? "☾" : "☀"}
        </button>
      </div>
    </div>
  );
}
