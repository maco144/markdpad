import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import taskLists from "markdown-it-task-lists";
// @ts-expect-error - no types shipped for markdown-it-katex
import katex from "markdown-it-katex";
import mermaid from "mermaid";
import { codeToHtml } from "shiki";

let mermaidInitialized = false;
function ensureMermaid(theme: "light" | "dark") {
  mermaid.initialize({
    startOnLoad: false,
    theme: theme === "dark" ? "dark" : "default",
    securityLevel: "strict",
  });
  mermaidInitialized = true;
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: false,
});

md.use(anchor, { permalink: false });
md.use(taskLists, { enabled: true, label: true });
md.use(katex);

// Defer code block rendering so we can use Shiki async; for now use a placeholder
// and let a post-render pass replace innerHTML.
const defaultFence =
  md.renderer.rules.fence ||
  function (tokens, idx, options, _env, self) {
    return self.renderToken(tokens, idx, options);
  };

md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const info = (token.info || "").trim();
  const lang = info.split(/\s+/)[0] || "";
  if (lang === "mermaid") {
    const id = `mmd-${Math.random().toString(36).slice(2, 10)}`;
    const code = token.content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<div class="mermaid-block" data-mmd="${id}"><pre>${code}</pre></div>`;
  }
  if (lang) {
    const code = token.content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<pre class="shiki-pending" data-lang="${lang}"><code>${code}</code></pre>`;
  }
  return defaultFence(tokens, idx, options, env, self);
};

export function renderMarkdown(source: string): string {
  return md.render(source || "");
}

export async function postRender(
  container: HTMLElement,
  theme: "light" | "dark"
): Promise<void> {
  if (!mermaidInitialized) ensureMermaid(theme);

  // Shiki pass
  const pending = container.querySelectorAll<HTMLPreElement>("pre.shiki-pending");
  await Promise.all(
    Array.from(pending).map(async (pre) => {
      const lang = pre.getAttribute("data-lang") || "text";
      const code = pre.textContent || "";
      try {
        const html = await codeToHtml(code, {
          lang,
          theme: theme === "dark" ? "github-dark" : "github-light",
        });
        pre.outerHTML = html;
      } catch {
        pre.classList.remove("shiki-pending");
        pre.classList.add("shiki-fallback");
      }
    })
  );

  // Mermaid pass
  const blocks = container.querySelectorAll<HTMLDivElement>(".mermaid-block");
  for (const block of Array.from(blocks)) {
    const pre = block.querySelector("pre");
    if (!pre) continue;
    const source = pre.textContent || "";
    const id = `mmd-svg-${Math.random().toString(36).slice(2, 10)}`;
    try {
      const { svg } = await mermaid.render(id, source);
      block.innerHTML = svg;
    } catch (err) {
      block.innerHTML = `<pre class="mermaid-error">${String(err)}</pre>`;
    }
  }
}

export function setMermaidTheme(theme: "light" | "dark") {
  mermaidInitialized = false;
  ensureMermaid(theme);
}
