use crate::definition::csv_definition::{
    CsvDefinitionKey, CsvParser, CsvValidator, CSV_DEFINITIONS,
};
use crate::model::expense::Expense;
use crate::store::app_store::ExpenseStore;
use csv::ReaderBuilder;
use std::collections::HashMap;
use std::error::Error as StdError;
use std::fs::File;
use std::io::Error as IoError;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;

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
    csv_definitions: &HashMap<CsvDefinitionKey, Box<dyn CsvValidator>>,
) -> Result<Option<Vec<CsvDefinitionKey>>, Box<dyn StdError>> {
    let mut matched_definition_keys: Vec<CsvDefinitionKey> = Vec::new();
    // We’ll reuse the same file handle by resetting it for each definition test.
    for (&csv_definition_key, definition) in csv_definitions.iter() {
        // Reset file cursor before re-reading
        let mut reader_file = file;
        reader_file.seek(SeekFrom::Start(0))?;

        // Check if the CSV definition has headers
        let has_header: bool = definition.has_header();

        let mut reader = ReaderBuilder::new()
            .has_headers(has_header)
            .from_reader(reader_file);

        let mut all_valid = true;
        let mut record_count = 0;

        for record in reader.records() {
            let record = match record {
                Ok(rec) => rec,
                Err(_) => {
                    all_valid = false;
                    break;
                }
            };

            if !definition.validate_against_record(&record) {
                all_valid = false;
                break;
            } else {
                record_count += 1;
            }
        }

        if all_valid && record_count > 0 {
            matched_definition_keys.push(csv_definition_key);
        }
    }

    if matched_definition_keys.is_empty() {
        return Ok(None);
    }

    // If none matched, return None
    return Ok(Some(matched_definition_keys));
}

pub fn determine_chunk_size(mut file: File, threads: usize) -> Result<Vec<(u64, u64)>, IoError> {
    let metadata = file.metadata()?;
    let file_size = metadata.len();
    let approx_chunk_size = file_size / threads as u64;

    println!("Calculated chunk size! Approximate: {}", approx_chunk_size);

    let mut offsets = Vec::new();
    let mut start = 0;

    for i in 0..threads {
        let mut end = start + approx_chunk_size;

        // Make sure the last chunk goes to the end of the file
        if i == threads - 1 {
            end = file_size;
        } else {
            // Adjust end to the next newline
            file.seek(SeekFrom::Start(end))?;
            let mut buf = [0 as u8; 1];
            while end < file_size {
                let bytes_read = file.read(&mut buf)?;
                if bytes_read == 0 || buf[0] == b'\n' {
                    break;
                }
                end += 1;
            }
        }
        offsets.push((start, end));
        start = end + 1;
    }

    return Ok(offsets);
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

    let mut duplicate_count: u16 = 0;
    let mut added_count: u16 = 0;

    for record in reader.records() {
        let record = match record {
            Ok(rec) => rec,
            Err(err) => {
                return Err(format!("Failed to read CSV record: {}", err).into());
            }
        };

        // Parse a record and return as Expense object if successfully
        let parsed_record: Expense = csv_definition.parse_record(&record)?;

        let result_expense_added: bool = expense_store.add_expense(parsed_record, false)?;

        if !result_expense_added {
            duplicate_count += 1;
        } else {
            added_count += 1;
        }
    }

    return Ok((added_count, duplicate_count));
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
