import type { OpenFile } from "../types";

interface Props {
  active: OpenFile | null;
  selection: { line: number; col: number } | null;
}

function countWords(s: string): number {
  const trimmed = s.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function StatusBar({ active, selection }: Props) {
  if (!active) {
    return (
      <div className="statusbar statusbar-empty">
        <span className="status-item">No file open</span>
      </div>
    );
  }
  const dirty = active.content !== active.savedContent;
  const words = countWords(active.content);
  const chars = active.content.length;
  return (
    <div className="statusbar">
      <div className="status-left">
        <span className="status-item">{active.mode === "edit" ? "Edit" : "View"}</span>
        {active.mode === "edit" && selection && (
          <span className="status-item">
            Ln {selection.line}, Col {selection.col}
          </span>
        )}
      </div>
      <div className="status-right">
        <span className="status-item">{words.toLocaleString()} words</span>
        <span className="status-item">{chars.toLocaleString()} chars</span>
        <span className={`status-item ${dirty ? "status-dirty" : "status-clean"}`}>
          {dirty ? "Unsaved" : "Saved"}
        </span>
      </div>
    </div>
  );
}
