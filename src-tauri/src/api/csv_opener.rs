use crate::definition::csv_definition::{CsvDefinitionKey, CsvValidator, CSV_DEFINITIONS};
use crate::model::expense::Expense;
use crate::model::response::{Response, Status};
use crate::service::csv_file_service::{
    open_csv_file_and_find_definitions, open_file_from_path,
    parse_csv_file_with_selected_definition,
};
use crate::store::app_store::ExpenseStore;
use std::collections::HashMap;
use std::error::Error as StdError;
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
pub fn open_csv_from_path(file: String) -> Response {
    match open_file_from_path(&file) {
        Ok(file) => {
            // process CSV here
            println!("File opened: {:?}", file);

            // Temporarily casts all key, value map to use CsvValidator (polymorphism)
            let defs: HashMap<_, Box<dyn CsvValidator>> = CSV_DEFINITIONS
                .iter()
                .map(|(k, v)| (*k, Box::new(v.clone()) as Box<dyn CsvValidator>))
                .collect();

            let find_matched_definitions: Result<Option<Vec<CsvDefinitionKey>>, Box<dyn StdError>> =
                open_csv_file_and_find_definitions(&file, &defs);

            if find_matched_definitions.is_ok() {
                match find_matched_definitions.unwrap() {
                    Some(list_of_keys) => {
                        return Response::ok(
                            String::from("Matching definition found"),
                            &list_of_keys,
                        );
                    }
                    None => {
                        return Response::new(
                            Status::NotFound,
                            String::from("No matching definition found"),
                            Option::<Vec<CsvDefinitionKey>>::None,
                        );
                    }
                }
            } else {
                return Response::err(
                    String::from("Failed to find matching definition"),
                    Option::<Vec<CsvDefinitionKey>>::None,
                );
            }
        }
        Err(e) => {
            return Response::err(
                format!("Failed to open file: {}", e),
                Option::<Vec<CsvDefinitionKey>>::None,
            );
        }
    }
}

#[tauri::command]
pub fn parse_csv_from_path(
    expense_store_state: State<'_, ExpenseStore>,
    path: String,
    csvDefinitionKey: CsvDefinitionKey,
) -> Response {
    match parse_csv_file_with_selected_definition(
        expense_store_state.inner(),
        path,
        csvDefinitionKey,
    ) {
        Ok((added_count, duplicate_count)) => {
            return Response::ok(
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
    expense_store_state: State<'_, ExpenseStore>,
    mut expense: Expense,
) -> Response {
    match expense_store_state.add_expense_manual(expense) {
        Ok(added) => {
            if added {
                return Response::ok(
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
pub fn update_expense(
    expense_store_state: State<'_, ExpenseStore>,
    hash: String,
    expense: Expense,
) -> Response {
    match expense_store_state.update_expense(hash, expense) {
        Ok(updated) => {
            if updated {
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
