use store::app_store::ExpenseStore;
use tauri::Manager;
use tauri_plugin_store::StoreExt;

mod api;
mod config;
pub mod definition;
mod model;
pub mod service;
mod store;
mod utils;

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

            // Initialize the store for backend
            let expense_store = ExpenseStore::new(store);

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
            app.manage(expense_store);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            api::store::store_set_value,
            api::store::store_get_value,
            api::window_manager::new_window,
            api::range_state::set_date_range,
            api::range_state::get_date_range,
            api::csv_opener::open_csv_from_path,
            api::csv_opener::parse_csv_from_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
