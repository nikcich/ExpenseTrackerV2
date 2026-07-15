use std::fs;

use crate::api::events::notify_store_changed;
use crate::definition::csv_definition::{
    CsvDefinition, CsvDefinitionKey, CsvParser, CSV_DEFINITIONS,
};
use crate::definition::dynamic_csv_definition::DynamicCsvDefinition;
use crate::model::expense::Expense;
use crate::model::response::{Response, Status};
use crate::service::csv_file_service::{open_csv_file_and_find_definitions, open_file_from_path};
use crate::store::app_store::ExpenseStore;
use serde::Serialize;
use std::error::Error as StdError;
use tauri::AppHandle;
use tauri::State;

/// Opens a CSV file from a given path.
///
/// If a valid definition was found, the response JSON body will contain the definition key.
/// Multiple definitions may be found for a given CSV file.
/// If no valid definition was found, the response will contain an error message in header.
/// If an error occurred, the response will contain an error message in header.
/// Returns:
/// Response message containing Status code, Header message (String), and JSON Body
#[tauri::command]
pub fn open_csv_from_path(file: String, custom_definitions_json: Option<String>) -> Response {
    match open_file_from_path(&file) {
        Ok(file) => {
            println!("File opened: {:?}", file);

            let find_matched_definitions: Result<Option<Vec<CsvDefinitionKey>>, Box<dyn StdError>> =
                open_csv_file_and_find_definitions(&file, &CSV_DEFINITIONS);

            let mut all_keys: Vec<String> = Vec::new();

            if find_matched_definitions.is_ok() {
                if let Some(list_of_keys) = find_matched_definitions.unwrap() {
                    for key in list_of_keys {
                        all_keys.push(format!("{:?}", key));
                    }
                }
            }

            if let Some(json) = custom_definitions_json {
                let all_custom: Vec<DynamicCsvDefinition> =
                    serde_json::from_str(&json).unwrap_or_default();
                for d in &all_custom {
                    if !all_keys.contains(&d.id) {
                        all_keys.push(d.id.clone());
                    }
                }
            }

            if all_keys.is_empty() {
                Response::new(
                    Status::NotFound,
                    String::from("No matching definition found"),
                    Option::<Vec<String>>::None,
                )
            } else {
                Response::new(
                    Status::Found,
                    String::from("Matching definition found"),
                    &all_keys,
                )
            }
        }
        Err(e) => Response::err(
            format!("Failed to open file: {}", e),
            Option::<Vec<String>>::None,
        ),
    }
}

#[tauri::command]
pub fn parse_csv_from_path(
    app_handle: AppHandle,
    expense_store_state: State<'_, ExpenseStore>,
    path: String,
    csv_definition_key: String,
    custom_definitions_json: Option<String>,
) -> Response {
    let csv_definition = if let Some(builtin_key) = match csv_definition_key.as_str() {
        "WellsFargo" => Some(CsvDefinitionKey::WellsFargo),
        "WellsFargo2026" => Some(CsvDefinitionKey::WellsFargo2026),
        "CapitalOne" => Some(CsvDefinitionKey::CapitalOne),
        "Amex" => Some(CsvDefinitionKey::Amex),
        "ExpenseTrackerV1" => Some(CsvDefinitionKey::ExpenseTrackerV1),
        "CapitalOneSavorOne" => Some(CsvDefinitionKey::CapitalOneSavorOne),
        "BankLeumi" => Some(CsvDefinitionKey::BankLeumi),
        "Max" => Some(CsvDefinitionKey::Max),
        "NavyFederal" => Some(CsvDefinitionKey::NavyFederal),
        "ExpenseTrackerBackup" => Some(CsvDefinitionKey::ExpenseTrackerBackup),
        _ => None,
    } {
        match CSV_DEFINITIONS.get(&builtin_key) {
            Some(def) => def.clone(),
            None => {
                return Response::err(
                    format!("Built-in definition not found: {}", csv_definition_key),
                    Option::<String>::None,
                );
            }
        }
    } else if let Some(json) = custom_definitions_json {
        let all_custom: Vec<DynamicCsvDefinition> = serde_json::from_str(&json).unwrap_or_default();
        match all_custom.iter().find(|d| d.id == csv_definition_key) {
            Some(dyn_def) => CsvDefinition::from(dyn_def),
            None => {
                return Response::err(
                    format!("Custom definition not found: {}", csv_definition_key),
                    Option::<String>::None,
                );
            }
        }
    } else {
        return Response::err(
            format!("Unknown definition: {}", csv_definition_key),
            Option::<String>::None,
        );
    };

    match crate::service::csv_file_service::parse_csv_file_with_definition(
        expense_store_state.inner(),
        path,
        &csv_definition,
    ) {
        Ok((added_count, duplicate_count)) => {
            notify_store_changed(&app_handle, "expenses");
            return Response::new(
                Status::Created,
                String::from("CSV parsed successfully"),
                format!(
                    "Added {} entries, ignored {} duplicate entries",
                    &added_count, &duplicate_count
                ),
            );
        }
        Err(e) => {
            return Response::err(
                format!("Failed to parse CSV: {}", e),
                Option::<String>::None,
            );
        }
    }
}

#[tauri::command]
pub fn add_expense_manual(
    app_handle: AppHandle,
    expense_store_state: State<'_, ExpenseStore>,
    expense: Expense,
) -> Response {
    match expense_store_state.add_expense(expense, true) {
        Ok(added) => {
            if added {
                notify_store_changed(&app_handle, "expenses");
                return Response::new(
                    Status::Created,
                    String::from("Expense added successfully"),
                    Option::<String>::None,
                );
            } else {
                return Response::new(
                    Status::Conflict,
                    String::from("Expense already exists for same time"),
                    Option::<String>::None,
                );
            }
        }
        Err(e) => {
            return Response::err(
                format!("Failed to add expense: {}", e),
                Option::<String>::None,
            );
        }
    }
}

#[tauri::command]
pub fn remove_bulk_expenses(
    app_handle: AppHandle,
    expense_store_state: State<'_, ExpenseStore>,
    hashes: Vec<String>,
) -> Response {
    match expense_store_state.remove_bulk_expenses(hashes) {
        Ok(updated) => {
            if updated {
                notify_store_changed(&app_handle, "expenses");
                return Response::ok(
                    String::from("Expenses removed successfully"),
                    Option::<String>::None,
                );
            } else {
                return Response::new(
                    Status::NotFound,
                    String::from("One or more expenses not found"),
                    Option::<String>::None,
                );
            }
        }
        Err(e) => {
            return Response::err(
                format!("Failed to remove expenses: {}", e),
                Option::<String>::None,
            );
        }
    }
}

#[tauri::command]
pub fn remove_expense(
    app_handle: AppHandle,
    expense_store_state: State<'_, ExpenseStore>,
    hash: String,
) -> Response {
    match expense_store_state.remove_expense(&hash) {
        Ok(updated) => {
            if updated {
                notify_store_changed(&app_handle, "expenses");
                return Response::ok(
                    String::from("Expense removed successfully"),
                    Option::<String>::None,
                );
            } else {
                return Response::new(
                    Status::NotFound,
                    String::from("Expense not found"),
                    Option::<String>::None,
                );
            }
        }
        Err(e) => {
            return Response::err(
                format!("Failed to remove expense: {}", e),
                Option::<String>::None,
            );
        }
    }
}

#[tauri::command]
pub fn update_bulk_expenses(
    app_handle: AppHandle,
    expense_store_state: State<'_, ExpenseStore>,
    hashes: Vec<String>,
    expenses: Vec<Expense>,
) -> Response {
    match expense_store_state.update_bulk_expenses(hashes, expenses) {
        Ok(updated) => {
            if updated {
                notify_store_changed(&app_handle, "expenses");
                return Response::ok(
                    String::from("Expenses updated successfully"),
                    Option::<String>::None,
                );
            } else {
                return Response::new(
                    Status::NotFound,
                    String::from("One or more expenses not found"),
                    Option::<String>::None,
                );
            }
        }
        Err(e) => {
            return Response::err(
                format!("Failed to update expenses: {}", e),
                Option::<String>::None,
            );
        }
    }
}

#[tauri::command]
pub fn update_expense(
    app_handle: AppHandle,
    expense_store_state: State<'_, ExpenseStore>,
    hash: String,
    expense: Expense,
) -> Response {
    match expense_store_state.update_expense(hash, expense) {
        Ok(updated) => {
            if updated {
                notify_store_changed(&app_handle, "expenses");
                return Response::ok(
                    String::from("Expense updated successfully"),
                    Option::<String>::None,
                );
            } else {
                return Response::new(
                    Status::NotFound,
                    String::from("Expense not found"),
                    Option::<String>::None,
                );
            }
        }
        Err(e) => {
            return Response::err(
                format!("Failed to update expense: {}", e),
                Option::<String>::None,
            );
        }
    }
}

#[tauri::command]
pub fn save_csv_to_path(path: String, content: String) -> Response {
    match fs::write(&path, content) {
        Ok(_) => Response::ok(String::from("File saved successfully"), Some(path)),
        Err(e) => Response::err(
            format!("Failed to save file: {}", e),
            Option::<String>::None,
        ),
    }
}

#[tauri::command]
pub fn read_csv_preview(path: String, rows: usize) -> Response {
    let file = match open_file_from_path(&path) {
        Ok(f) => f,
        Err(e) => {
            return Response::err(
                format!("Failed to open file: {}", e),
                Option::<Vec<Vec<String>>>::None,
            );
        }
    };

    let mut reader = csv::ReaderBuilder::new()
        .has_headers(false)
        .from_reader(file);

    let mut result: Vec<Vec<String>> = Vec::new();
    for (i, record) in reader.records().enumerate() {
        if i >= rows {
            break;
        }
        match record {
            Ok(rec) => {
                result.push(rec.iter().map(|s| s.to_string()).collect());
            }
            Err(_) => break,
        }
    }

    Response::ok(String::from("Preview loaded"), Some(result))
}

#[derive(Serialize, Clone, Debug)]
pub struct PreviewResult {
    pub row: usize,
    pub expense: Option<Expense>,
    pub error: Option<String>,
}

#[tauri::command]
pub fn preview_csv_parse(path: String, definition_json: String) -> Response {
    let dyn_def: DynamicCsvDefinition = match serde_json::from_str(&definition_json) {
        Ok(d) => d,
        Err(e) => {
            return Response::err(
                format!("Invalid definition JSON: {}", e),
                Option::<Vec<PreviewResult>>::None,
            );
        }
    };

    let csv_def = CsvDefinition::from(&dyn_def);

    let file = match open_file_from_path(&path) {
        Ok(f) => f,
        Err(e) => {
            return Response::err(
                format!("Failed to open file: {}", e),
                Option::<Vec<PreviewResult>>::None,
            );
        }
    };

    let mut reader = csv::ReaderBuilder::new()
        .has_headers(dyn_def.has_headers)
        .from_reader(file);

    let max_rows = 10;
    let mut results: Vec<PreviewResult> = Vec::new();

    for (i, record) in reader.records().enumerate() {
        if i >= max_rows {
            break;
        }
        match record {
            Ok(rec) => match csv_def.parse_record(&rec) {
                Ok(expense) => results.push(PreviewResult {
                    row: i,
                    expense: Some(expense),
                    error: None,
                }),
                Err(e) => results.push(PreviewResult {
                    row: i,
                    expense: None,
                    error: Some(format!("{}", e)),
                }),
            },
            Err(e) => results.push(PreviewResult {
                row: i,
                expense: None,
                error: Some(format!("Failed to read row: {}", e)),
            }),
        }
    }

    Response::ok(format!("Parsed {} rows", results.len()), Some(results))
}
