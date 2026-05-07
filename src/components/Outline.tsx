import { useMemo } from "react";
import { parseOutline, type OutlineItem } from "../outline";

interface Props {
  source: string;
  open: boolean;
  onToggle: () => void;
  onJump: (item: OutlineItem) => void;
}

export function Outline({ source, open, onToggle, onJump }: Props) {
  const items = useMemo(() => parseOutline(source), [source]);
  const minLevel = useMemo(
    () => (items.length ? Math.min(...items.map((i) => i.level)) : 1),
    [items]
  );

  return (
    <aside className={`outline ${open ? "outline-open" : "outline-collapsed"}`}>
      <div className="outline-header">
        <button
          type="button"
          className="icon-button"
          onClick={onToggle}
          title={open ? "Collapse outline" : "Expand outline"}
          aria-label="Toggle outline"
        >
          {open ? "›" : "‹"}
        </button>
        {open && <span className="outline-title">Outline</span>}
      </div>
      {open && (
        <ul className="outline-list">
          {items.length === 0 && <li className="outline-empty">No headings</li>}
          {items.map((item, i) => (
            <li
              key={`${i}-${item.slug}`}
              style={{ paddingLeft: 8 + (item.level - minLevel) * 14 }}
              className={`outline-item outline-h${item.level}`}
              onClick={() => onJump(item)}
              title={item.text}
            >
              {item.text}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
