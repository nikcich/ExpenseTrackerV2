use crate::api::events::notify_store_changed;
use crate::model::response::{Response, Status};
use crate::store::app_store::ExpenseStore;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::AppHandle;
use tauri::State;

#[derive(Serialize, Deserialize)]
pub struct ExportPayload {
    pub version: u32,
    pub data: Value,
}

const EXPORT_VERSION: u32 = 1;

#[tauri::command]
pub fn store_set_json_value(
    app_handle: AppHandle,
    expense_store_state: State<'_, ExpenseStore>,
    key: String,
    value: Value,
) -> Response {
    match expense_store_state.inner().set_json_value(&key, value) {
        Ok(_) => {
            notify_store_changed(&app_handle, &key);
            Response::ok("Value saved".to_string(), Option::<String>::None)
        }
        Err(e) => Response::err(
            format!("Failed to save value: {}", e),
            Option::<String>::None,
        ),
    }
}

#[tauri::command]
pub fn store_get_json_value(expense_store_state: State<'_, ExpenseStore>, key: String) -> Response {
    match expense_store_state.inner().get_json_value(&key) {
        Ok(Some(val)) => Response::ok("Value retrieved".to_string(), Some(val)),
        Ok(None) => Response::new(
            Status::NotFound,
            "Key not found".to_string(),
            Option::<Value>::None,
        ),
        Err(e) => Response::err(format!("Failed to get value: {}", e), Option::<Value>::None),
    }
}

#[tauri::command]
pub fn export_all_data(expense_store_state: State<'_, ExpenseStore>) -> Response {
    let data = expense_store_state.inner().get_all_store_data();
    let payload = ExportPayload {
        version: EXPORT_VERSION,
        data,
    };
    Response::ok("Data exported".to_string(), Some(payload))
}

#[tauri::command]
pub fn import_all_data(
    app_handle: AppHandle,
    expense_store_state: State<'_, ExpenseStore>,
    data: Value,
) -> Response {
    let imported: ExportPayload = match serde_json::from_value(data) {
        Ok(v) => v,
        Err(e) => {
            return Response::err(
                format!("Invalid import file: {}", e),
                Option::<Value>::None,
            )
        }
    };

    if imported.version > EXPORT_VERSION {
        return Response::err(
            format!(
                "Import file version {} is newer than supported version {}",
                imported.version, EXPORT_VERSION
            ),
            Option::<Value>::None,
        );
    }

    if let Some(obj) = imported.data.as_object() {
        let keys: Vec<String> = obj.keys().cloned().collect();
        for key in &keys {
            if let Some(value) = obj.get(key) {
                if let Err(e) = expense_store_state.inner().set_json_value(key, value.clone()) {
                    return Response::err(
                        format!("Failed to import key '{}': {}", key, e),
                        Option::<Value>::None,
                    );
                }
                notify_store_changed(&app_handle, key);
            }
        }
    }

    Response::ok(
        "Data imported successfully".to_string(),
        Some(serde_json::json!({ "imported_keys": imported.data.as_object().map(|o| o.keys().cloned().collect::<Vec<_>>()).unwrap_or_default() })),
    )
}
