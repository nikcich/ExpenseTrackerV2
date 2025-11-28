use crate::definition::csv_definition::{CsvDefinitionKey, CsvValidator, DEFINITIONS};
use crate::service::csv_file_service::{open_csv_file, open_file_from_path};
use std::collections::HashMap;
use std::error::Error as StdError;

#[tauri::command]
pub fn parse_csv(file: String) {
    match open_file_from_path(&file) {
        Ok(file) => {
            // process CSV here
            println!("File opened: {:?}", file);

            // Temporarily casts all key, value map to use CsvValidator (polymorphism)
            let defs: HashMap<_, Box<dyn CsvValidator>> = DEFINITIONS
                .iter()
                .map(|(k, v)| (*k, Box::new(v.clone()) as Box<dyn CsvValidator>))
                .collect();

            let find_matched_definition: Result<Option<CsvDefinitionKey>, Box<dyn StdError>> =
                open_csv_file(&file, &defs);

            if find_matched_definition.is_ok() {
                println!(
                    "Found definition key: {:?}",
                    find_matched_definition.unwrap()
                );
            }
        }
        Err(e) => eprintln!("Failed to open file: {}", e),
    }
}
