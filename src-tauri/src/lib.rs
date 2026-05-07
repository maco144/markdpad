use std::path::{Path, PathBuf};
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

fn extract_md_paths<I: IntoIterator<Item = String>>(args: I, cwd: Option<&Path>) -> Vec<String> {
    args.into_iter()
        .skip(1)
        .filter(|a| !a.starts_with("--"))
        .filter(|a| {
            let lower = a.to_lowercase();
            lower.ends_with(".md") || lower.ends_with(".markdown") || lower.ends_with(".mdx")
        })
        .map(|a| {
            let p = Path::new(&a);
            if p.is_absolute() {
                a
            } else if let Some(c) = cwd {
                c.join(&a).to_string_lossy().into_owned()
            } else {
                a
            }
        })
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_cwd = std::env::current_dir().ok();
    let initial_files = extract_md_paths(std::env::args(), initial_cwd.as_deref());

    let mut builder = tauri::Builder::default();

    #[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            let cwd_path = PathBuf::from(&cwd);
            let files = extract_md_paths(args, Some(&cwd_path));
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.unminimize();
                let _ = win.show();
                let _ = win.set_focus();
            }
            if !files.is_empty() {
                let _ = app.emit("files-opened", files);
            }
        }));
    }

    builder
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
