export type Mode = "view" | "edit";

export interface OpenFile {
  id: string;
  path: string | null;
  name: string;
  content: string;
  savedContent: string;
  mode: Mode;
  isNew: boolean;
}

export interface AppState {
  files: OpenFile[];
  activeId: string | null;
  sidebarOpen: boolean;
  theme: "light" | "dark";
}
