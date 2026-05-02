import type { OpenFile } from "../types";

interface Props {
  files: OpenFile[];
  activeId: string | null;
  open: boolean;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onToggle: () => void;
  onNew: () => void;
  onOpen: () => void;
}

export function Sidebar({
  files,
  activeId,
  open,
  onSelect,
  onClose,
  onToggle,
  onNew,
  onOpen,
}: Props) {
  return (
    <aside className={`sidebar ${open ? "sidebar-open" : "sidebar-collapsed"}`}>
      <div className="sidebar-header">
        <button
          type="button"
          className="icon-button"
          onClick={onToggle}
          title={open ? "Collapse sidebar (Ctrl+B)" : "Expand sidebar (Ctrl+B)"}
          aria-label="Toggle sidebar"
        >
          {open ? "‹" : "›"}
        </button>
        {open && <span className="sidebar-title">Files</span>}
      </div>
      {open && (
        <>
          <div className="sidebar-actions">
            <button type="button" className="action" onClick={onNew} title="New file (Ctrl+N)">
              + New
            </button>
            <button type="button" className="action" onClick={onOpen} title="Open file (Ctrl+O)">
              Open…
            </button>
          </div>
          <ul className="file-list">
            {files.length === 0 && <li className="file-empty">No files open</li>}
            {files.map((f) => {
              const dirty = f.content !== f.savedContent;
              const active = f.id === activeId;
              return (
                <li
                  key={f.id}
                  className={`file-item ${active ? "file-item-active" : ""}`}
                  onClick={() => onSelect(f.id)}
                  title={f.path || f.name}
                >
                  <span className="file-name">
                    {f.name}
                    {dirty ? " •" : ""}
                  </span>
                  <button
                    type="button"
                    className="file-close"
                    aria-label={`Close ${f.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose(f.id);
                    }}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </aside>
  );
}
