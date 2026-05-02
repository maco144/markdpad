import { useEffect, useMemo, useRef } from "react";
import { renderMarkdown, postRender } from "../markdown";

interface Props {
  source: string;
  theme: "light" | "dark";
}

export function Preview({ source, theme }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const html = useMemo(() => renderMarkdown(source), [source]);

  useEffect(() => {
    if (!ref.current) return;
    let cancelled = false;
    const el = ref.current;
    el.innerHTML = html;
    postRender(el, theme).catch(() => {});
    return () => {
      cancelled = true;
      void cancelled;
    };
  }, [html, theme]);

  return <div className="preview" ref={ref} />;
}
