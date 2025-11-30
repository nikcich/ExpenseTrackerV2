use crate::model::response::Response;
use lazy_static::lazy_static;
use std::sync::RwLock;

lazy_static! {
    static ref SHARED_DATE_RANGE: RwLock<Option<(i64, i64)>> = RwLock::new(None);
}

#[tauri::command]
pub fn set_date_range(start: i64, end: i64) -> Response {
    match SHARED_DATE_RANGE.write() {
        Ok(mut range) => {
            *range = Some((start, end));
            Response::ok(
                "Date range saved successfully".to_string(),
                Option::<String>::None,
            )
        }
        Err(_) => Response::err(
            "Failed to acquire write lock".to_string(),
            Option::<String>::None,
        ),
    }
}

#[tauri::command]
pub fn get_date_range() -> Response {
    match SHARED_DATE_RANGE.read() {
        Ok(range) => {
            Response::ok(
                "Range got successfully".to_string(),
                *range, // Option<(i64, i64)>
            )
        }
        Err(_) => Response::err(
            "Failed to acquire read lock".to_string(),
            Option::<String>::None,
        ),
    }
}
