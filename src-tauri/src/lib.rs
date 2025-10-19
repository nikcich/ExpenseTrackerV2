use tauri::{Manager};
use tauri_plugin_store::{ StoreExt};

mod store;

#[tauri::command]
async fn new_window(app: tauri::AppHandle) {
    let len = app.webview_windows().len();
    let label = format!("window-{}", len);

    let _webview_window = tauri::WebviewWindowBuilder::new(
        &app,
        label,
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title(&format!("My Window {}", len))
    .build()
    .unwrap();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            let store = app.store("store.json")
                .map_err(|e| format!("Failed to load store: {}", e))?;

            app.manage(store);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            store::store_set_value,
            store::store_get_value,
            new_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
