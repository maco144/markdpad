import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { syntaxHighlighting, defaultHighlightStyle, indentOnInput, bracketMatching } from "@codemirror/language";
import { search, searchKeymap } from "@codemirror/search";
import { oneDark } from "@codemirror/theme-one-dark";

export interface EditorSelection {
  line: number;
  col: number;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelectionChange?: (sel: EditorSelection) => void;
  theme: "light" | "dark";
  scrollToLine?: number | null;
}

export function Editor({ value, onChange, onSelectionChange, theme, scrollToLine }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  // Build editor once; rebuild when theme changes.
  useEffect(() => {
    if (!hostRef.current) return;

    const extensions = [
      lineNumbers(),
      highlightActiveLine(),
      history(),
      indentOnInput(),
      bracketMatching(),
      syntaxHighlighting(defaultHighlightStyle),
      search({ top: true }),
      keymap.of([...searchKeymap, ...defaultKeymap, ...historyKeymap]),
      markdown(),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
        if (update.selectionSet || update.docChanged) {
          const head = update.state.selection.main.head;
          const line = update.state.doc.lineAt(head);
          onSelectionChangeRef.current?.({
            line: line.number,
            col: head - line.from + 1,
          });
        }
      }),
    ];
    if (theme === "dark") extensions.push(oneDark);

    const state = EditorState.create({
      doc: value,
      extensions,
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // Sync external value changes (file switch, file reloaded) without losing cursor
  // unless the doc actually differs.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  // Scroll to a target line (used by outline clicks).
  useEffect(() => {
    const view = viewRef.current;
    if (!view || scrollToLine == null) return;
    const lineNum = Math.max(1, Math.min(scrollToLine, view.state.doc.lines));
    const line = view.state.doc.line(lineNum);
    view.dispatch({
      selection: { anchor: line.from },
      effects: EditorView.scrollIntoView(line.from, { y: "start", yMargin: 12 }),
    });
    view.focus();
  }, [scrollToLine]);

  return <div className="editor" ref={hostRef} />;
}
