use chrono::NaiveDate;
use csv::ReaderBuilder;
use csv::StringRecord;
use mockall::automock;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::error::Error as StdError;
use std::fs::File;
use std::io::Error as IoError;
use std::io::{Seek, SeekFrom};

/// ENUM DEFINITIONS

#[derive(Debug, Hash, Eq, PartialEq, Clone, Copy)]
pub enum CsvColumnRole {
    Date,
    Description,
    Amount,
}

#[derive(Debug, Eq, PartialEq, Clone, Copy)]
pub enum CsvColumnDataType {
    Float,
    String,
    DateObject,
}

#[derive(Debug)]
pub struct CsvColumnInfo {
    index: u8,
    data_type: CsvColumnDataType,
}

#[derive(Debug)]
pub struct CsvDefinition {
    name: &'static str,
    has_headers: bool,
    expected_columns: HashMap<CsvColumnRole, CsvColumnInfo>,
}

impl CsvDefinition {
    pub fn new(
        name: &'static str,
        has_headers: bool,
        expected_columns: HashMap<CsvColumnRole, CsvColumnInfo>,
    ) -> Self {
        return Self {
            name,
            has_headers,
            expected_columns,
        };
    }
}

#[automock]
pub trait CsvValidator {
    /// Validates a CSV definition against CSV record.
    ///
    /// Parameters:
    /// - `record`: The CSV record to validate with.
    ///
    /// Returns:
    /// - `bool`: True if the record is valid for this definition, false otherwise.
    fn validate_against_record(&self, record: &StringRecord) -> bool;

    /// Checks if the CSV definition has headers.
    ///
    /// Returns:
    /// - `bool`: True if the definition has headers, false otherwise.
    fn has_header(&self) -> bool;
}

impl CsvValidator for CsvDefinition {
    fn validate_against_record(&self, record: &StringRecord) -> bool {
        // Iterate over expected columns
        for (_role, col_info) in &self.expected_columns {
            let index = col_info.index as usize;

            // Check if the record has a value at this index
            if index >= record.len() {
                // Missing column
                return false;
            }

            // Check for empty cells
            if record
                .get(index)
                .map(|s| s.trim().is_empty())
                .unwrap_or(true)
            {
                return false;
            }

            // Check if castable
            let raw_data: &str = record.get(index).map(|s| s.trim()).unwrap();
            if !attempt_to_cast(raw_data, col_info.data_type) {
                return false;
            }
        }
        return true;
    }

    fn has_header(&self) -> bool {
        return self.has_headers;
    }
}

#[derive(Hash, Eq, PartialEq, Debug, Clone, Copy)]
pub enum CsvDefinitionKey {
    WellsFargo,
    CapitalOne,
}

/// FUNCTION DEFINITIONS

/// Helper function that builds a column map from a list of (role, index, datatype) pairs.
///
/// Parameters:
/// - `columns`: A list of tuples containing the column role, index, and data type.
///
/// Returns:
/// - `HashMap`: mapping column roles to their corresponding information.
pub fn make_column_definitions(
    columns: &[(CsvColumnRole, u8, CsvColumnDataType)],
) -> HashMap<CsvColumnRole, CsvColumnInfo> {
    let mut map = HashMap::new();
    for (role, index, datatype) in columns {
        map.insert(
            *role,
            CsvColumnInfo {
                index: *index,
                data_type: *datatype,
            },
        );
    }
    map
}

/// Builds a map of CSV definitions for different CSV files
///
/// Returns:
/// - `HashMap`: mapping CSV definition keys to their corresponding definitions.
pub fn build_definitions() -> HashMap<CsvDefinitionKey, CsvDefinition> {
    let mut map = HashMap::new();

    map.insert(
        CsvDefinitionKey::WellsFargo,
        CsvDefinition::new(
            "Wells Fargo Spending Report",
            true,
            make_column_definitions(&[
                (CsvColumnRole::Date, 0, CsvColumnDataType::DateObject),
                (CsvColumnRole::Description, 1, CsvColumnDataType::String),
                (CsvColumnRole::Amount, 2, CsvColumnDataType::Float),
            ]),
        ),
    );

    map.insert(
        CsvDefinitionKey::CapitalOne,
        CsvDefinition::new(
            "Capital One Spending Report",
            true,
            make_column_definitions(&[
                (CsvColumnRole::Date, 0, CsvColumnDataType::DateObject),
                (CsvColumnRole::Description, 1, CsvColumnDataType::String),
                (CsvColumnRole::Amount, 2, CsvColumnDataType::Float),
            ]),
        ),
    );

    return map;
}

static CSV_DEFINITIONS: Lazy<HashMap<CsvDefinitionKey, CsvDefinition>> =
    Lazy::new(|| build_definitions());

static CSV_DEFINITION_KEYS: [CsvDefinitionKey; 2] =
    [CsvDefinitionKey::WellsFargo, CsvDefinitionKey::CapitalOne];

/// Opens a CSV file and returns the corresponding CSV definition key if it matches any of the predefined definitions.
///
/// Parameters:
/// - `file`: The CSV file to open.
///
/// Returns:
/// - `Result<Option<CsvDefinitionKey>, Box<dyn StdError>>`: None or a valid CsvDefinitionKey
pub fn open_csv_file(
    file: &File,
    csv_definitions: &HashMap<&CsvDefinitionKey, &Box<dyn CsvValidator>>,
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
            return Ok(Some(*csv_definition_key));
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

/// Attempts to cast a raw string value to a data type.
///
/// Parameters:
/// - `raw_data`: The raw string value to cast.
/// - `col_data_type`: The target data type to cast to.
///
/// Returns:
/// - `bool`: True if the cast is successful, false otherwise.
pub fn attempt_to_cast(raw_data: &str, col_data_type: CsvColumnDataType) -> bool {
    match col_data_type {
        CsvColumnDataType::String => return true, // Always valid for raw data that is already a string
        CsvColumnDataType::Float => match raw_data.parse::<f32>() {
            Ok(value) => return value.is_finite(), // Reject infinity and NaN
            Err(_) => return false,                // Reject parse failures
        },
        CsvColumnDataType::DateObject => {
            return NaiveDate::parse_from_str(raw_data, "%Y-%m-%d").is_ok()
        }
    }
}
