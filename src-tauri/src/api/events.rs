use serde::Serialize;
use tauri::Emitter;

use tauri::AppHandle;

#[derive(Clone, Serialize)]
pub struct StoreChangedPayload {
    pub key: String,
}

pub fn notify_store_changed(app_handle: &AppHandle, key: &str) {
    let _ = app_handle.emit(
        "store-changed",
        StoreChangedPayload {
            key: key.to_string(),
        },
    );
}
