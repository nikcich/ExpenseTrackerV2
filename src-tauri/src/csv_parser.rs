use crate::definition::csv_definition::{CsvDefinitionKey, CsvValidator, CSV_DEFINITIONS};
use crate::model::response::{Response, Status};
use crate::service::csv_file_service::{open_csv_file, open_file_from_path};
use std::collections::HashMap;
use std::error::Error as StdError;

#[tauri::command]
pub fn parse_csv(file: String) -> Response<serde_json::Value> {
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
                        let serialized_definitions = serde_json::to_value(&list_of_keys);
                        return Response::ok(serialized_definitions.unwrap());
                    }
                    None => {
                        println!("No matching definition found");
                        return Response::new(
                            Status::NotFound,
                            serde_json::Value::String("No matching definition found".to_string()),
                        );
                    }
                }
            } else {
                println!("Failed to find matching definition");
                return Response::err(serde_json::Value::String(
                    "Failed to find matching definition".to_string(),
                ));
            }
        }
        Err(e) => {
            eprintln!("Failed to open file: {}", e);
            Response::err(serde_json::Value::String("Failed to open file".to_string()))
        }
    }
}
