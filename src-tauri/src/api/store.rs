use crate::model::response::{Response, Status};
use crate::store::app_store::ExpenseStore;
use tauri::State;

#[tauri::command]
/// state is injected from tauri
pub fn store_set_value(
    expense_store_state: State<'_, ExpenseStore>,
    value: serde_json::Value,
) -> Response {
    match expense_store_state.inner().overwrite_using_json(value) {
        Ok(_) => {
            return Response::ok(
                "Value saved successfully".to_string(),
                Option::<String>::None,
            )
        }
        Err(e) => Response::err(
            format!("Failed to save value: {}", e.to_string()),
            Option::<String>::None,
        ),
    }
}

#[tauri::command]
/// state is injected from tauri
pub fn store_get_value(expense_store_state: State<'_, ExpenseStore>) -> Response {
    match expense_store_state.inner().get_all_expense() {
        Ok(None) => {
            return Response::new(
                Status::NotFound,
                format!("Could not find expenses"),
                Option::<String>::None,
            )
        }
        Ok(Some(val)) => {
            return Response::ok(
                format!("Successfully retrieved all expenses").to_string(),
                val,
            )
        }
        Err(e) => {
            return Response::err(
                format!("Error occured when retrieving expenses: {}", e),
                Option::<String>::None,
            )
        }
    }
}
