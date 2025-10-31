use serde::de::DeserializeOwned;
use serde::Serialize;
use std::sync::Arc;
use tauri::Wry;
use tauri::{AppHandle, Manager};
use tauri_plugin_store::Store;

fn get_store(app_handle: &tauri::AppHandle) -> Arc<Store<Wry>> {
    app_handle.state::<Arc<Store<Wry>>>().inner().clone()
}

fn store_get<K, V>(app_handle: &AppHandle, key: K) -> Result<V, String>
where
    K: AsRef<str>,
    V: DeserializeOwned,
{
    let store: Arc<Store<Wry>> = get_store(app_handle);

    if let Some(value) = store.get(key.as_ref()) {
        serde_json::from_value(value.clone())
            .map_err(|e| format!("Failed to deserialize value: {}", e))
    } else {
        Err("Key not found".to_string())
    }
}

fn store_set<K, V>(app_handle: &AppHandle, key: K, value: V) -> Result<(), String>
where
    K: AsRef<str>,
    V: Serialize,
{
    let store: Arc<Store<Wry>> = get_store(app_handle);

    let json_value =
        serde_json::to_value(value).map_err(|e| format!("Failed to serialize value: {}", e))?;

    store.set(key.as_ref(), json_value);

    store
        .save()
        .map_err(|e| format!("Failed to save store: {}", e))
}

#[tauri::command]
pub fn store_set_value(
    app_handle: AppHandle,
    key: String,
    value: serde_json::Value,
) -> Result<(), String> {
    store_set(&app_handle, key, value)
}

#[tauri::command]
pub fn store_get_value(app_handle: AppHandle, key: String) -> Result<serde_json::Value, String> {
    store_get::<_, serde_json::Value>(&app_handle, key)
}
