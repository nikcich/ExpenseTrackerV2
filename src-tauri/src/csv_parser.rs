use crate::definition::csv_definition::{CsvDefinitionKey, CsvValidator, CSV_DEFINITIONS};
use crate::model::response::{Response, Status};
use crate::service::csv_file_service::{open_csv_file, open_file_from_path};
use std::collections::HashMap;
use std::error::Error as StdError;

#[tauri::command]
pub fn parse_csv(file: String) -> Response<String> {
    match open_file_from_path(&file) {
        Ok(file) => {
            // process CSV here
            println!("File opened: {:?}", file);

            // Temporarily casts all key, value map to use CsvValidator (polymorphism)
            let defs: HashMap<_, Box<dyn CsvValidator>> = CSV_DEFINITIONS
                .iter()
                .map(|(k, v)| (*k, Box::new(v.clone()) as Box<dyn CsvValidator>))
                .collect();

            let find_matched_definition: Result<Option<CsvDefinitionKey>, Box<dyn StdError>> =
                open_csv_file(&file, &defs);

            if find_matched_definition.is_ok() {
                match find_matched_definition.unwrap() {
                    Some(key) => {
                        println!(
                            "Matching definition found: {}",
                            CSV_DEFINITIONS.get(&key).unwrap().get_name()
                        );
                        return Response::new(
                            Status::Ok,
                            CSV_DEFINITIONS.get(&key).unwrap().get_name().to_string(),
                        );
                    }
                    None => {
                        println!("No matching definition found");
                        return Response::new(
                            Status::NotFound,
                            "No matching definition found".to_string(),
                        );
                    }
                }
            } else {
                println!("Failed to find matching definition");
                return Response::new(
                    Status::InternalServerError,
                    "Failed to find matching definition".to_string(),
                );
            }
        }
        Err(e) => {
            eprintln!("Failed to open file: {}", e);
            Response::new(
                Status::InternalServerError,
                "Failed to open file".to_string(),
            )
        }
    }
}
