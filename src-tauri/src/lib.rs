use std::path::PathBuf;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{Emitter, Manager, State};

#[derive(Default)]
struct PendingOpen(Mutex<Vec<String>>);

#[derive(Serialize)]
struct FileMeta {
    path: String,
    name: String,
    exists: bool,
}

#[tauri::command]
fn file_meta(path: String) -> FileMeta {
    let p = PathBuf::from(&path);
    let name = p
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.clone());
    FileMeta {
        path: path.clone(),
        name,
        exists: p.exists(),
    }
}

#[tauri::command]
fn drain_pending_opens(pending: State<'_, PendingOpen>) -> Vec<String> {
    let mut g = pending.0.lock().unwrap();
    std::mem::take(&mut *g)
}

fn collect_cli_files(args: impl Iterator<Item = String>) -> Vec<String> {
    args.skip(1)
        .filter(|a| !a.starts_with("--"))
        .filter(|a| {
            let lower = a.to_lowercase();
            lower.ends_with(".md") || lower.ends_with(".markdown") || lower.ends_with(".mdx")
        })
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_files = collect_cli_files(std::env::args());

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .manage(PendingOpen(Mutex::new(initial_files)))
        .setup(|app| {
            let handle = app.handle().clone();
            let pending = app.state::<PendingOpen>();
            let initial = pending.0.lock().unwrap().clone();
            if !initial.is_empty() {
                let _ = handle.emit("files-opened", initial);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![file_meta, drain_pending_opens])
        .run(tauri::generate_context!())
        .expect("error while running markdpad");
}
