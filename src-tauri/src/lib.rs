use serde_json::{Value};
use tauri::Manager;
use tauri_plugin_store::StoreExt;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn store_set_value(app_handle: tauri::AppHandle, value: u32) -> Result<(), String> {
    let store = match app_handle.store("store.json") {
        Ok(store) => store,
        Err(e) => return Err(format!("Failed to create/load store: {}", e)),
    };
    
    store.set("my_value", value);

    if store.length() > 0 {
        Ok(())
    } else {
        Err("Failed to set value in store".to_string())
    }
}

#[tauri::command]
fn store_get_value(app_handle: tauri::AppHandle) -> Result<Value, String> {
    let store = app_handle
        .store("store.json")
        .map_err(|e| format!("Failed to create/load store: {}", e))?;

    if let Some(value) = store.get("my_value") {
        return Ok(value.clone());
    }

    let default_value = Value::from(0);
    store.set("my_value", default_value.clone());

    if let Err(e) = store.save() {
        return Err(format!("Failed to save store: {}", e));
    }

    Ok(default_value)
}

#[tauri::command]
async fn new_window(app: tauri::AppHandle) {
    let len = app.webview_windows().len();
    let label = format!("window-{}", len);

    let _webview_window = tauri::WebviewWindowBuilder::new(
        &app,
        label,
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title(&format!("My Window {}", len)) // <-- set custom title here
    .build()
    .unwrap();
}
// fn new_window(app: tauri::AppHandle) -> tauri::Result<()> {
//     let len = app.webview_windows().len();
 
//     WebviewWindowBuilder::new(
//         &app,
//         format!("window-{}", len),
//         tauri::WebviewUrl::App("https://google.com/".into()),
//     )
//     .build()?;
 
//     Ok(())
// }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![greet])
        .invoke_handler(tauri::generate_handler![
            store_set_value,
            store_get_value,
            new_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
