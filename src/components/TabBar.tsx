import type { OpenFile } from "../types";

interface Props {
  files: OpenFile[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

export function TabBar({ files, activeId, onSelect, onClose }: Props) {
  if (files.length === 0) return null;
  return (
    <div className="tabbar" role="tablist">
      {files.map((f) => {
        const dirty = f.content !== f.savedContent;
        const active = f.id === activeId;
        return (
          <div
            key={f.id}
            role="tab"
            aria-selected={active}
            className={`tab ${active ? "tab-active" : ""}`}
            onClick={() => onSelect(f.id)}
            title={f.path || f.name}
          >
            <span className="tab-name">
              {f.name}
              {dirty ? " •" : ""}
            </span>
            <button
              type="button"
              className="tab-close"
              aria-label={`Close ${f.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onClose(f.id);
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
