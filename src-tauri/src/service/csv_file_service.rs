use crate::definition::csv_definition::{
    CsvDefinition, CsvDefinitionKey, CsvParser, CsvValidator, CSV_DEFINITIONS,
};
use crate::model::expense::Expense;
use crate::store::app_store::ExpenseStore;
use csv::{ReaderBuilder, StringRecord};
use std::collections::HashMap;
use std::error::Error as StdError;
use std::fs::File;
use std::io::Error as IoError;
use std::path::Path;
use std::sync::Arc;
use std::thread;

const NUM_THREADS: usize = 12;

/// FUNCTION DEFINITIONS

/// Opens a CSV file and returns the corresponding CSV definition key if it matches any of the predefined definitions.
///
/// Parameters:
/// - `file`: The CSV file to open.
///
/// Returns:
/// - `Result<Option<CsvDefinitionKey>, Box<dyn StdError>>`: None or a valid CsvDefinitionKey
pub fn open_csv_file_and_find_definitions(
    file: &File,
    csv_definitions: &'static HashMap<CsvDefinitionKey, CsvDefinition>,
) -> Result<Option<Vec<CsvDefinitionKey>>, Box<dyn StdError>> {
    let mut reader = ReaderBuilder::new().has_headers(false).from_reader(file);

    let mut lines: Vec<StringRecord> = Vec::new();

    for record in reader.records() {
        match record {
            Ok(rec) => lines.push(rec),
            Err(_) => return Err("Could not read CSV file".into()),
        }
    }

    // Collect keys for deterministic chunking
    let definition_keys: Vec<_> = csv_definitions.keys().collect();
    let chunk_size: usize = definition_keys.len() / NUM_THREADS;
    let remainder: usize = definition_keys.len() % NUM_THREADS;

    // Create shared pointers (RAII stuff)
    let shared_lines = Arc::new(lines);
    let shared_keys = Arc::new(definition_keys);

    let mut thread_handles = Vec::new();

    for thread_id in 0..NUM_THREADS {
        let start_def = thread_id * chunk_size;
        let mut end_def = start_def + chunk_size;

        if thread_id == NUM_THREADS - 1 {
            end_def += remainder;
        }

        // Clone Arcs cheaply for threads
        let lines_ref = Arc::clone(&shared_lines);
        let keys_ref = Arc::clone(&shared_keys);

        let handle = thread::spawn(move || {
            let mut worker_matched = Vec::new();

            // Main work loop for each thread
            // The work is the chunks defined above
            for idx in start_def..end_def {
                // Borrow the key from Arc
                let key = keys_ref[idx];
                // Borrow the validator
                let validator = &csv_definitions[&key];

                let start_idx = if validator.has_header() { 1 } else { 0 };

                let mut all_valid = true;

                // Loop through cached lines with the definition
                for line in &lines_ref[start_idx..] {
                    if !validator.validate_against_record(line) {
                        all_valid = false;
                        break;
                    }
                }

                if all_valid {
                    worker_matched.push(key);
                }
            }

            worker_matched
        });

        thread_handles.push(handle);
    }

    let mut matched = Vec::new();
    for handle in thread_handles {
        let thread_results = handle.join().unwrap();
        matched.extend(thread_results.iter().cloned());
    }

    return Ok(Some(matched));
}

/// Parse a CSV file with a given definition and update the store
pub fn parse_csv_file_with_selected_definition(
    expense_store: &ExpenseStore,
    path: String,
    csv_definition_key: CsvDefinitionKey,
) -> Result<(u16, u16), Box<dyn StdError>> {
    let csv_definition = CSV_DEFINITIONS
        .get(&csv_definition_key)
        .ok_or("CSV definition not found")?;

    let file =
        open_file_from_path(&path).map_err(|_| format!("Failed to open file at path: {}", path))?;
    let mut reader = ReaderBuilder::new()
        .has_headers(csv_definition.has_header())
        .from_reader(file);
    let mut expenses_batch = Vec::new();
    let mut lines: Vec<StringRecord> = Vec::new();

    for record in reader.records() {
        let record = match record {
            Ok(rec) => rec,
            Err(err) => {
                return Err(format!("Failed to read CSV record: {}", err).into());
            }
        };
        lines.push(record);
    }

    let lines = Arc::new(lines);
    let chunk_size: usize = lines.len() / NUM_THREADS;
    let remainder: usize = lines.len() % NUM_THREADS;
    let mut thread_handles = Vec::new();

    for thread_id in 0..NUM_THREADS {
        let start_idx = thread_id * chunk_size;
        let mut end_idx = start_idx + chunk_size;

        if thread_id == NUM_THREADS - 1 {
            end_idx += remainder;
        }

        let lines_ref = Arc::clone(&lines);
        let handle = thread::spawn(move || {
            let mut worker_parsed = Vec::new();

            // Main work loop for each thread
            // The work is the chunks defined above
            for idx in start_idx..end_idx {
                let line = &lines_ref[idx];

                // Parse a record and return as Expense object if successfully
                let parsed_record: Expense = csv_definition.parse_record(line).unwrap();

                worker_parsed.push(parsed_record);
            }

            worker_parsed
        });

        thread_handles.push(handle);
    }

    for handle in thread_handles {
        let thread_results = handle.join().unwrap();
        expenses_batch.extend(thread_results.iter().cloned());
    }

    if let Ok(result) = expense_store.add_expense_as_batch(expenses_batch, false) {
        return Ok((result.added_count, result.duplicate_count));
    }

    return Err("Failed to add expenses".into());
}

/// Opens a CSV file from a given path, only if it has a `.csv` extension.
///
/// Parameters:
/// - `path`: The path to the CSV file.
///
/// Returns:
/// - `Result<File, IoError>`: The opened file or an error.
pub fn open_file_from_path(path: &str) -> Result<File, IoError> {
    let path_obj = Path::new(path);

    // Check that the extension is .csv
    match path_obj.extension().and_then(|ext| ext.to_str()) {
        Some("csv") => File::open(path_obj),
        _ => Err(IoError::new(
            std::io::ErrorKind::InvalidInput,
            "File must be a .csv extension",
        )),
    }
}
