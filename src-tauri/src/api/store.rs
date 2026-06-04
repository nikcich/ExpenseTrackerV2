use crate::model::response::{Response, Status};
use crate::store::app_store::ExpenseStore;
use serde_json::Value;
use tauri::State;

#[tauri::command]
pub fn store_set_json_value(
    expense_store_state: State<'_, ExpenseStore>,
    key: String,
    value: Value,
) -> Response {
    match expense_store_state.inner().set_json_value(&key, value) {
        Ok(_) => Response::ok("Value saved".to_string(), Option::<String>::None),
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
