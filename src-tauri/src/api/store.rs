// use crate::model::response::{Response, Status};
// use tauri::AppHandle;

// #[tauri::command]
// pub fn store_set_value(app_handle: AppHandle, key: String, value: serde_json::Value) -> Response {
//     match store_set(&app_handle, key, value) {
//         Ok(_) => Response::ok(
//             "Value saved successfully".to_string(),
//             Option::<String>::None,
//         ),
//         Err(e) => Response::err(
//             format!("Failed to set value: {}", e),
//             Option::<String>::None,
//         ),
//     }
// }

// #[tauri::command]
// pub fn store_get_value(app_handle: AppHandle, key: String) -> Response {
//     match store_get::<_, serde_json::Value>(&app_handle, key) {
//         Ok(val) => {
//             Response::serde_value(Status::Ok, "Value retrieved successfully".to_string(), val)
//         }
//         Err(e) => Response::err(
//             format!("Failed to get value: {}", e),
//             Option::<String>::None,
//         ),
//     }
// }
