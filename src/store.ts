import { LazyStore } from "@tauri-apps/plugin-store";
import type { Mode } from "./types";

const store = new LazyStore("markdpad-state.json");

const modeKey = (path: string) => `mode:${path}`;
const THEME_KEY = "ui:theme";
const SIDEBAR_KEY = "ui:sidebarOpen";
const OUTLINE_KEY = "ui:outlineOpen";
const RECENT_KEY = "ui:recentPaths";

export async function loadFileMode(path: string): Promise<Mode | null> {
  const v = await store.get<Mode>(modeKey(path));
  return v === "view" || v === "edit" ? v : null;
}

export async function saveFileMode(path: string, mode: Mode): Promise<void> {
  await store.set(modeKey(path), mode);
}

export async function loadTheme(): Promise<"light" | "dark"> {
  const v = await store.get<"light" | "dark">(THEME_KEY);
  return v === "dark" ? "dark" : v === "light" ? "light" : "light";
}

export async function saveTheme(theme: "light" | "dark"): Promise<void> {
  await store.set(THEME_KEY, theme);
}

export async function loadSidebarOpen(): Promise<boolean> {
  const v = await store.get<boolean>(SIDEBAR_KEY);
  return v ?? true;
}

export async function saveSidebarOpen(open: boolean): Promise<void> {
  await store.set(SIDEBAR_KEY, open);
}

export async function loadOutlineOpen(): Promise<boolean> {
  const v = await store.get<boolean>(OUTLINE_KEY);
  return v ?? true;
}

export async function saveOutlineOpen(open: boolean): Promise<void> {
  await store.set(OUTLINE_KEY, open);
}

export async function loadRecent(): Promise<string[]> {
  const v = await store.get<string[]>(RECENT_KEY);
  return Array.isArray(v) ? v : [];
}

export async function pushRecent(path: string): Promise<void> {
  const list = await loadRecent();
  const next = [path, ...list.filter((p) => p !== path)].slice(0, 20);
  await store.set(RECENT_KEY, next);
}

export async function removeRecent(path: string): Promise<void> {
  const list = await loadRecent();
  await store.set(
    RECENT_KEY,
    list.filter((p) => p !== path)
  );
}
