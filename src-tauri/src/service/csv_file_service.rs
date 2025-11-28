use crate::definition::csv_definition::{CsvDefinitionKey, CsvValidator};

use csv::ReaderBuilder;
use std::collections::HashMap;
use std::error::Error as StdError;
use std::fs::File;
use std::io::Error as IoError;
use std::io::{Seek, SeekFrom};

/// FUNCTION DEFINITIONS

/// Opens a CSV file and returns the corresponding CSV definition key if it matches any of the predefined definitions.
///
/// Parameters:
/// - `file`: The CSV file to open.
///
/// Returns:
/// - `Result<Option<CsvDefinitionKey>, Box<dyn StdError>>`: None or a valid CsvDefinitionKey
pub fn open_csv_file(
    file: &File,
    csv_definitions: &HashMap<CsvDefinitionKey, Box<dyn CsvValidator>>,
) -> Result<Option<CsvDefinitionKey>, Box<dyn StdError>> {
    // We’ll reuse the same file handle by resetting it for each definition test.
    for (&csv_definition_key, definition) in csv_definitions.iter() {
        // Reset file cursor before re-reading
        let mut reader_file = file;
        reader_file.seek(SeekFrom::Start(0))?;

        // Check if the CSV definition has headers
        let has_header: bool = definition.has_header();

        let mut rdr = ReaderBuilder::new()
            .has_headers(has_header)
            .from_reader(reader_file);

        let mut all_valid = true;

        for result in rdr.records() {
            let record = result?;

            if !definition.validate_against_record(&record) {
                all_valid = false;
                break;
            }
        }

        if all_valid {
            return Ok(Some(csv_definition_key));
        }
    }

    // If none matched, return None
    return Ok(None);
}

/// Opens a CSV file from a given path.
///
/// Parameters:
/// - `path`: The path to the CSV file.
///
/// Returns:
/// - `Result<File, IoError>`: The opened file or an error.
pub fn open_file_from_path(path: &str) -> Result<File, IoError> {
    let file = File::open(path)?;
    return Ok(file);
}
