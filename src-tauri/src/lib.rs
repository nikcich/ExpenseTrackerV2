use tauri::Manager;
use tauri_plugin_store::StoreExt;

mod config;
mod csv_parser;
pub mod definition;
mod range_state;
pub mod service;
mod store;
mod utils;
mod window_manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            // Load the store
            let store = app
                .store("store.json")
                .map_err(|e| format!("Failed to load store: {}", e))?;

            // Get main window via AppHandle hello world
            let app_handle = app.handle();
            let main_window = app_handle
                .get_webview_window("main")
                .expect("Failed to get main window");

            // Set title
            main_window
                .set_title(config::WINDOW_TITLE)
                .expect("Failed to set window title");

            // Make the store available to commands
            app.manage(store);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            store::store_set_value,
            store::store_get_value,
            window_manager::new_window,
            range_state::set_date_range,
            range_state::get_date_range,
            csv_parser::parse_csv,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
