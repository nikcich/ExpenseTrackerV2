use std::sync::RwLock;
use lazy_static::lazy_static;

lazy_static! {
    static ref SHARED_DATE_RANGE: RwLock<Option<(i64, i64)>> = RwLock::new(None);
}

// Save a date range
#[tauri::command]
pub fn set_date_range(start: i64, end: i64) {
    *SHARED_DATE_RANGE.write().unwrap() = Some((start, end));
}

// Get the current date range
#[tauri::command]
pub fn get_date_range() -> Option<(i64, i64)> {
    *SHARED_DATE_RANGE.read().unwrap()
}
