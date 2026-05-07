import { useEffect, useMemo, useRef } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { renderMarkdown, postRender } from "../markdown";

interface Props {
  source: string;
  theme: "light" | "dark";
  scrollTo?: string | null;
}

export function Preview({ source, theme, scrollTo }: Props) {
  const innerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const html = useMemo(() => renderMarkdown(source), [source]);

  useEffect(() => {
    if (!innerRef.current) return;
    const el = innerRef.current;
    el.innerHTML = html;
    postRender(el, theme).catch(() => {});
  }, [html, theme]);

  // Intercept link clicks: external URLs go to the OS browser, in-page anchors
  // scroll within the preview, file:// links are ignored.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest("a") as
        | HTMLAnchorElement
        | null;
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href) return;
      e.preventDefault();
      if (href.startsWith("#")) {
        const id = decodeURIComponent(href.slice(1));
        const el = innerRef.current?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (/^(https?|mailto):/i.test(href)) {
        void openUrl(href).catch(() => {});
      }
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, []);

  // Scroll to an outline target (heading id) when requested.
  useEffect(() => {
    if (!scrollTo || !innerRef.current) return;
    const el = innerRef.current.querySelector<HTMLElement>(
      `#${CSS.escape(scrollTo)}`
    );
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scrollTo]);

  return (
    <div className="preview" ref={scrollRef}>
      <div className="preview-inner" ref={innerRef} />
    </div>
  );
}
