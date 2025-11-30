use serde::de::DeserializeOwned;
use serde::Serialize;
use std::sync::Arc;
use tauri::Wry;
use tauri::{AppHandle, Manager};
use tauri_plugin_store::Store;

/// STORE data structure example:
/// {
///     "user_expense": [
///         {
///             "uuid": uuid1
///             "name": "Transaction One"
///             "amount": 100.0,
///             "tags": ["Food"],
///             "date": "2023-01-01"
///         },
///         {
///             "uuid": uuid2
///             "name": "Transaction Two"
///             "amount": 200.0,
///             "tags": ["Gas"],
///             "date": "2023-01-01"
///         }
///     ]
/// }

fn get_store(app_handle: &tauri::AppHandle) -> Arc<Store<Wry>> {
    app_handle.state::<Arc<Store<Wry>>>().inner().clone()
}

/// DO NOT call this function from the UI. This is to be handled only by the backend.
/// Instead, call store.rs functions exposed in the API module.
pub fn store_get<K, V>(app_handle: &AppHandle, key: K) -> Result<V, String>
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

/// DO NOT call this function from the UI. This is to be handled only by the backend.
/// Instead, call store.rs functions exposed in the API module.
pub fn store_set<K, V>(app_handle: &AppHandle, key: K, value: V) -> Result<(), String>
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
