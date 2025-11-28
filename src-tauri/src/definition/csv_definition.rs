use chrono::NaiveDate;
use csv::StringRecord;
use mockall::automock;
use once_cell::unsync::Lazy;
use std::collections::HashMap;

///GLOBAL DEFINITIONS
static CSV_DEFINITIONS: Lazy<HashMap<CsvDefinitionKey, CsvDefinition>> =
    Lazy::new(|| build_definitions());

static CSV_DEFINITION_KEYS: [CsvDefinitionKey; 2] =
    [CsvDefinitionKey::WellsFargo, CsvDefinitionKey::CapitalOne];

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
    return map;
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
