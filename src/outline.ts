export interface OutlineItem {
  level: number;
  text: string;
  slug: string;
  line: number;
}

// Match markdown-it-anchor's default slugify so DOM ids align with our slugs.
function baseSlug(s: string): string {
  return encodeURIComponent(s.trim().toLowerCase().replace(/\s+/g, "-"));
}

export function parseOutline(source: string): OutlineItem[] {
  const items: OutlineItem[] = [];
  const lines = source.split("\n");
  let inFence = false;
  let fenceMarker = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Track fenced code blocks (``` or ~~~) so we don't pick up #-headings inside.
    const fenceMatch = line.match(/^(\s*)(```+|~~~+)/);
    if (fenceMatch) {
      const marker = fenceMatch[2][0];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
      } else if (marker === fenceMarker) {
        inFence = false;
      }
      continue;
    }
    if (inFence) continue;

    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    items.push({
      level: m[1].length,
      text: m[2],
      slug: baseSlug(m[2]),
      line: i + 1,
    });
  }

  // De-duplicate slugs (markdown-it-anchor appends -1, -2, … to repeats).
  const seen = new Map<string, number>();
  for (const item of items) {
    const n = seen.get(item.slug) ?? 0;
    if (n > 0) item.slug = `${item.slug}-${n}`;
    seen.set(item.slug, n + 1);
  }
  return items;
}
