
use crate::utils::{generate_uuid};
use crate::config::{WINDOW_TITLE};
#[tauri::command]
pub async fn new_window(app: tauri::AppHandle) {
    let label = generate_uuid();

    let _webview_window = tauri::WebviewWindowBuilder::new(
        &app,
        &label,
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title(WINDOW_TITLE)
    .build()
    .unwrap();
}