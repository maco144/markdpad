import type { Mode, OpenFile } from "../types";

interface Props {
  active: OpenFile | null;
  theme: "light" | "dark";
  onModeChange: (mode: Mode) => void;
  onSave: () => void;
  onToggleTheme: () => void;
}

export function Toolbar({ active, theme, onModeChange, onSave, onToggleTheme }: Props) {
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
