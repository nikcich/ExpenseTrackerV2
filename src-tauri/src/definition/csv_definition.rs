use crate::model::expense::Expense;
use chrono::NaiveDate;
use csv::StringRecord;
use mockall::automock;
use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::error::Error as StdError;

pub const STANDARD: bool = true;
pub const INVERSED: bool = false;

///GLOBAL DEFINITIONS
pub static CSV_DEFINITIONS: Lazy<HashMap<CsvDefinitionKey, CsvDefinition>> =
    Lazy::new(|| build_definitions());

/// ENUM DEFINITIONS

#[derive(Debug, Hash, Eq, PartialEq, Clone, Copy)]
pub enum CsvColumnRole {
    Date,
    Description,
    Amount,
    Tag,
}

impl CsvColumnRole {
    /// This function is used for required roles where they must return a valid string and not empty string
    fn get_required_and_normalize<'a>(
        role_type: Self,
        string_record: &'a StringRecord,
        column_info: &CsvColumnInfo,
    ) -> Result<&'a str, Box<dyn StdError>> {
        let value = string_record
            .get(column_info.index as usize)
            .ok_or(format!(
                "Missing column in CSV record for required role {:?}",
                role_type
            ))?;
        let normalized = normalize(value);
        if normalized.is_empty() {
            return Err(format!(
                "Column value is an empty string for required role {:?}",
                role_type
            )
            .into());
        }
        return Ok(value);
    }
    pub fn handle(
        self,
        expense: &mut Expense,
        string_record: &StringRecord,
        column_info: &CsvColumnInfo,
    ) -> Result<(), Box<dyn StdError>> {
        match self {
            // REQUIRED roles below, error is propagated
            CsvColumnRole::Date => {
                if let CsvColumnDataType::DateObject(format) = column_info.data_type {
                    let normalized_str_from_record =
                        Self::get_required_and_normalize(self, string_record, column_info)?;

                    let date = NaiveDate::parse_from_str(&normalized_str_from_record, format)?
                        .and_hms_opt(0, 0, 0)
                        .ok_or("Failed to create datetime")?;
                    expense.set_date(date);
                    return Ok(());
                }
                return Err("Date column must have DateObject format specified".into());
            }
            CsvColumnRole::Description => {
                let normalized_str_from_record =
                    Self::get_required_and_normalize(self, string_record, column_info)?;

                expense.set_description(&normalized_str_from_record);
                return Ok(());
            }
            CsvColumnRole::Amount => {
                let normalized_str_from_record =
                    Self::get_required_and_normalize(self, string_record, column_info)?;

                let mut amount = normalized_str_from_record.parse::<f64>()?;

                // Check if the amount column is inverted
                if let CsvColumnDataType::Float(is_standard) = column_info.data_type {
                    if !*is_standard {
                        amount = -amount;
                    }
                }
                expense.set_amount(amount);
                return Ok(());
            }

            // OPTIONAL ROLES below no error is propagated
            CsvColumnRole::Tag => {
                if let Some(tag) = string_record.get(column_info.index as usize) {
                    let normalized = normalize(tag);
                    if !normalized.is_empty() {
                        // If the string isn't empty, add as a tag
                        expense.add_tag(&normalized);
                    }
                }
                return Ok(());
            }
        }
    }
}

#[derive(Debug, Eq, PartialEq, Clone, Copy)]
pub enum CsvColumnDataType {
    Float(&'static bool), // True if standard, False if inversed sign
    String,
    DateObject(&'static str), // Format string for parsing dates
}

#[derive(Debug, Clone, Copy)]
pub struct CsvColumnInfo {
    pub index: u8,
    pub data_type: CsvColumnDataType,
}

#[derive(Debug, Clone)]
pub struct CsvDefinition {
    name: &'static str,
    has_headers: bool,
    required_columns: HashMap<CsvColumnRole, CsvColumnInfo>,
    optional_columns: HashMap<CsvColumnRole, CsvColumnInfo>,
}

impl CsvDefinition {
    pub fn new(
        name: &'static str,
        has_headers: bool,
        required_columns: &[(CsvColumnRole, CsvColumnInfo)],
    ) -> Self {
        let mut map = HashMap::new();
        for &(role, col_info) in required_columns {
            map.insert(role, col_info);
        }
        return Self {
            name,
            has_headers,
            required_columns: map,
            optional_columns: HashMap::new(),
        };
    }

    pub fn add_optional_column(mut self, role: CsvColumnRole, info: CsvColumnInfo) -> Self {
        self.optional_columns.insert(role, info);
        return self;
    }

    pub fn get_name(&self) -> &str {
        self.name
    }
}

fn normalize(s: &str) -> String {
    let re = Regex::new(r"\s+").unwrap();
    re.replace_all(s.trim(), " ").to_string()
}

pub trait CsvParser {
    /// Parses a CSV record with a current definition
    ///
    /// Parameters:
    /// - `record`: The CSV record to parse with.
    ///
    /// Returns:
    /// - 'Expense': The Expense object containing converted data
    fn parse_record(&self, record: &StringRecord) -> Result<Expense, Box<dyn StdError>>;
}

impl CsvParser for CsvDefinition {
    fn parse_record(&self, record: &StringRecord) -> Result<Expense, Box<dyn StdError>> {
        let mut expense = Expense::default();

        // Parse REQUIRED columns in record
        for (role, column_info) in self.required_columns.iter() {
            role.handle(&mut expense, record, &column_info)?;
        }

        // Parse OPTIONAL columns in record
        if !self.optional_columns.is_empty() {
            for (role, info) in self.optional_columns.iter() {
                match role.handle(&mut expense, record, &info) {
                    // Ignore any errors
                    Err(_) => continue,
                    _ => {}
                }
            }
        }

        return Ok(expense);
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
        for (_role, col_info) in &self.required_columns {
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

#[derive(Serialize, Hash, Eq, PartialEq, Debug, Clone, Copy, Deserialize)]
pub enum CsvDefinitionKey {
    WellsFargo,
    CapitalOne,
    Amex,
    ExpenseTrackerV1,
}

/// Helper function that builds a column map from a list of (role, index, datatype) pairs.
///
/// Parameters:
/// - `columns`: A list of tuples containing the column role, index, and data type.
///
/// Returns:
/// - `HashMap`: mapping column roles to their corresponding information.
/// Builds a map of CSV definitions for different CSV files
///
/// Returns:
/// - `HashMap`: mapping CSV definition keys to their corresponding definitions.
pub fn build_definitions() -> HashMap<CsvDefinitionKey, CsvDefinition> {
    let mut map: HashMap<CsvDefinitionKey, CsvDefinition> = HashMap::new();

    map.insert(
        CsvDefinitionKey::ExpenseTrackerV1,
        CsvDefinition::new(
            "Expense Tracker V1 Migration Report",
            true,
            &[
                (
                    CsvColumnRole::Date,
                    CsvColumnInfo {
                        index: 1,
                        data_type: CsvColumnDataType::DateObject("%m/%d/%Y"),
                    },
                ),
                (
                    CsvColumnRole::Description,
                    CsvColumnInfo {
                        index: 2,
                        data_type: CsvColumnDataType::String,
                    },
                ),
                (
                    CsvColumnRole::Amount,
                    CsvColumnInfo {
                        index: 3,
                        data_type: CsvColumnDataType::Float(&STANDARD),
                    },
                ),
            ],
        )
        .add_optional_column(
            CsvColumnRole::Tag,
            CsvColumnInfo {
                index: 0,
                data_type: CsvColumnDataType::String,
            },
        ),
    );

    map.insert(
        CsvDefinitionKey::WellsFargo,
        CsvDefinition::new(
            "Wells Fargo Spending Report",
            false,
            &[
                (
                    CsvColumnRole::Date,
                    CsvColumnInfo {
                        index: 0,
                        data_type: CsvColumnDataType::DateObject("%m/%d/%Y"),
                    },
                ),
                (
                    CsvColumnRole::Amount,
                    CsvColumnInfo {
                        index: 1,
                        data_type: CsvColumnDataType::Float(&INVERSED),
                    },
                ),
                (
                    CsvColumnRole::Description,
                    CsvColumnInfo {
                        index: 4,
                        data_type: CsvColumnDataType::String,
                    },
                ),
            ],
        ),
    );

    map.insert(
        CsvDefinitionKey::Amex,
        CsvDefinition::new(
            "American Express Credit Spending Report",
            true,
            &[
                (
                    CsvColumnRole::Date,
                    CsvColumnInfo {
                        index: 0,
                        data_type: CsvColumnDataType::DateObject("%m/%d/%Y"),
                    },
                ),
                (
                    CsvColumnRole::Description,
                    CsvColumnInfo {
                        index: 1,
                        data_type: CsvColumnDataType::String,
                    },
                ),
                (
                    CsvColumnRole::Amount,
                    CsvColumnInfo {
                        index: 2,
                        data_type: CsvColumnDataType::Float(&STANDARD),
                    },
                ),
            ],
        ),
    );

    map.insert(
        CsvDefinitionKey::CapitalOne,
        CsvDefinition::new(
            "Capital One Spending Report",
            true,
            &[
                (
                    CsvColumnRole::Description,
                    CsvColumnInfo {
                        index: 1,
                        data_type: CsvColumnDataType::String,
                    },
                ),
                (
                    CsvColumnRole::Date,
                    CsvColumnInfo {
                        index: 2,
                        data_type: CsvColumnDataType::DateObject("%m/%d/%Y"),
                    },
                ),
                (
                    CsvColumnRole::Amount,
                    CsvColumnInfo {
                        index: 4,
                        data_type: CsvColumnDataType::Float(&STANDARD),
                    },
                ),
            ],
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
        CsvColumnDataType::Float(_) => match raw_data.parse::<f32>() {
            Ok(value) => return value.is_finite(), // Reject infinity and NaN
            Err(_) => return false,                // Reject parse failures
        },
        CsvColumnDataType::DateObject(format) => {
            match NaiveDate::parse_from_str(raw_data, format) {
                Ok(date) => date.and_hms_opt(0, 0, 0).is_some(),
                Err(_) => false,
            }
        }
    }
}
