import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { renderMarkdown, postRender } from "./markdown";

async function renderOffscreen(
  source: string,
  theme: "light" | "dark"
): Promise<string> {
  const tmp = document.createElement("div");
  tmp.style.position = "absolute";
  tmp.style.left = "-9999px";
  tmp.style.top = "0";
  tmp.style.width = "920px";
  document.body.appendChild(tmp);
  try {
    tmp.innerHTML = renderMarkdown(source);
    await postRender(tmp, theme);
    return tmp.innerHTML;
  } finally {
    document.body.removeChild(tmp);
  }
}

const printCss = `
:root { color-scheme: light; }
body {
  font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
  font-size: 14px;
  line-height: 1.65;
  color: #1a1a1a;
  background: #ffffff;
  max-width: 920px;
  margin: 32px auto;
  padding: 0 48px;
}
h1, h2, h3, h4, h5, h6 { margin: 1.4em 0 0.6em; font-weight: 600; line-height: 1.25; }
h1 { font-size: 2em; border-bottom: 1px solid #e2e2e6; padding-bottom: 0.3em; }
h2 { font-size: 1.5em; border-bottom: 1px solid #e2e2e6; padding-bottom: 0.3em; }
h3 { font-size: 1.25em; }
p, ul, ol, blockquote, pre, table { margin: 0.8em 0; }
a { color: #0078d4; text-decoration: none; }
blockquote { border-left: 4px solid #c8c8cc; color: #5a5a5a; padding: 0.2em 1em; margin-left: 0; }
code { font-family: "Cascadia Code", "Consolas", monospace; font-size: 0.92em; background: #f4f4f5; border-radius: 3px; padding: 0.15em 0.35em; }
pre { background: #f4f4f5; border: 1px solid #e2e2e6; border-radius: 6px; padding: 12px 14px; overflow-x: auto; }
pre code { background: transparent; padding: 0; font-size: 13px; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #e2e2e6; padding: 6px 10px; }
th { background: #f7f7f8; font-weight: 600; }
img { max-width: 100%; border-radius: 4px; }
hr { border: none; border-top: 1px solid #e2e2e6; margin: 2em 0; }
.task-list-item { list-style: none; }
.task-list-item input { margin-right: 0.4em; }
.mermaid-block { display: flex; justify-content: center; margin: 1em 0; }
.mermaid-block svg { max-width: 100%; }
@media print {
  body { margin: 0; padding: 0 24px; }
  pre, blockquote, table, img { page-break-inside: avoid; }
  h1, h2, h3 { page-break-after: avoid; }
  a { color: #1a1a1a; text-decoration: underline; }
}
`;

function buildStandaloneHtml(body: string, title: string): string {
  const escTitle = title.replace(/[<&>]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;"
  );
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escTitle}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css">
<style>${printCss}</style>
</head>
<body>
${body}
</body>
</html>`;
}

export async function exportHtml(
  source: string,
  theme: "light" | "dark",
  suggestedName: string
): Promise<void> {
  const baseName = suggestedName.replace(/\.(md|markdown|mdx)$/i, "") || "document";
  const path = await saveDialog({
    defaultPath: `${baseName}.html`,
    filters: [{ name: "HTML", extensions: ["html"] }],
  });
  if (!path) return;
  const body = await renderOffscreen(source, theme);
  const doc = buildStandaloneHtml(body, baseName);
  await writeTextFile(path, doc);
}

export async function exportPdf(
  source: string,
  theme: "light" | "dark",
  suggestedName: string
): Promise<void> {
  const baseName = suggestedName.replace(/\.(md|markdown|mdx)$/i, "") || "document";
  const body = await renderOffscreen(source, theme);
  const doc = buildStandaloneHtml(body, baseName);
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);
  await new Promise<void>((resolve) => {
    iframe.onload = () => resolve();
    iframe.srcdoc = doc;
  });
  // Give KaTeX/Mermaid stylesheet a beat to settle.
  await new Promise((r) => setTimeout(r, 250));
  try {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  } finally {
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1500);
  }
}
