use crate::definition::csv_definition::{CsvDefinitionKey, CsvValidator, CSV_DEFINITIONS};
use crate::model::response::{Response, Status};
use crate::service::csv_file_service::{open_csv_file, open_file_from_path};
use std::collections::HashMap;
use std::error::Error as StdError;

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
                open_csv_file(&file, &defs);

            if find_matched_definitions.is_ok() {
                match find_matched_definitions.unwrap() {
                    Some(list_of_keys) => {
                        println!("Matching definition found");
                        return Response::ok(
                            String::from("Matching definition found"),
                            &list_of_keys,
                        );
                    }
                    None => {
                        println!("No matching definition found");
                        return Response::new(
                            Status::NotFound,
                            String::from("No matching definition found"),
                            Option::<Vec<CsvDefinitionKey>>::None,
                        );
                    }
                }
            } else {
                println!("Failed to find matching definition");
                return Response::err(
                    String::from("Failed to find matching definition"),
                    Option::<Vec<CsvDefinitionKey>>::None,
                );
            }
        }
        Err(e) => {
            eprintln!("Failed to open file: {}", e);
            return Response::err(
                format!("Failed to open file: {}", e),
                Option::<Vec<CsvDefinitionKey>>::None,
            );
        }
    }
}
