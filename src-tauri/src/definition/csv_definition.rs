use crate::model::expense::Expense;
use chrono::NaiveDate;
use csv::StringRecord;
use mockall::automock;
use once_cell::sync::Lazy;
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
}

#[derive(Debug, Eq, PartialEq, Clone, Copy)]
pub enum CsvColumnDataType {
    Float(&'static bool), // True if standard, False if inversed sign
    String,
    DateObject(&'static str), // Format string for parsing dates
}

impl CsvColumnDataType {
    pub fn is_standard(&self) -> Option<&bool> {
        if let CsvColumnDataType::Float(b) = self {
            return Some(&b);
        } else {
            return None;
        }
    }

    pub fn get_format_from_date(&self) -> Option<&'static str> {
        if let CsvColumnDataType::DateObject(s) = self {
            return Some(s);
        } else {
            return None;
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub struct CsvColumnInfo {
    index: u8,
    data_type: CsvColumnDataType,
}

#[derive(Clone)]
pub struct CsvDefinition {
    name: &'static str,
    has_headers: bool,
    expected_columns: HashMap<CsvColumnRole, CsvColumnInfo>,
    // Meta Data currently supports only mutating the amount column
    meta_data: Vec<(MetaDataType, CsvColumnInfo)>,
}

#[derive(Clone, Debug)]
pub enum MetaDataType {
    // CsvColumnInfo is to grab the column info of other amount
    // MetaDataType enums can have any supplemental dependencies owned by the enum itself
    Currency(CsvColumnInfo),
}

impl MetaDataType {
    pub fn handle(
        &self,
        amount_to_mutate: &mut f64,
        parsed_meta_value: &str,
        string_record: &StringRecord,
    ) -> Result<(), Box<dyn StdError>> {
        match self {
            MetaDataType::Currency(second_amount_column_info) => {
                if parsed_meta_value == "$" {
                    // The currency is reported as dollars, we need to override the amount
                    let raw = string_record
                        .get(second_amount_column_info.index as usize)
                        .ok_or("Missing second amount column")?;

                    let parsed_amount: f64 = raw.parse()?;
                    *amount_to_mutate = parsed_amount;

                    return Ok(());
                } else if parsed_meta_value == "₪" {
                    *amount_to_mutate /= 3.5;
                    return Ok(());
                } else {
                    return Err(format!("Unknown currency symbol: {}", parsed_meta_value).into());
                }
            }
        }
    }
}

impl CsvDefinition {
    pub fn new(
        name: &'static str,
        has_headers: bool,
        expected_columns: HashMap<CsvColumnRole, CsvColumnInfo>,
        meta_data: Vec<(MetaDataType, CsvColumnInfo)>,
    ) -> Self {
        return Self {
            name,
            has_headers,
            expected_columns,
            meta_data,
        };
    }

    pub fn get_name(&self) -> &str {
        self.name
    }
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
        // Get all of the column infos to parse with
        let date_info: &CsvColumnInfo = self
            .expected_columns
            .get(&CsvColumnRole::Date)
            .ok_or("Missing date column definition in CSV definition")?;

        let desc_info: &CsvColumnInfo = self
            .expected_columns
            .get(&CsvColumnRole::Description)
            .ok_or("Missing description column definition in CSV definition")?;

        let amount_info: &CsvColumnInfo = self
            .expected_columns
            .get(&CsvColumnRole::Amount)
            .ok_or("Missing amount column definition in CSV definition")?;

        // Extract all of the str from record
        let date_str: &str = record
            .get(date_info.index as usize)
            .ok_or(format!("Missing date at column {}", date_info.index))?;
        let desc_str: &str = record
            .get(desc_info.index as usize)
            .ok_or(format!("Missing description at column {}", desc_info.index))?;
        let amount_str: &str = record
            .get(amount_info.index as usize)
            .ok_or(format!("Missing amount at column {}", amount_info.index))?;

        // Use the date format from the column definition
        let date_format = date_info
            .data_type
            .get_format_from_date()
            .ok_or("Date column must have DateObject format specified")?;

        let amount_is_standard = amount_info
            .data_type
            .is_standard()
            .ok_or("Amount column must have Float type with inversion flag specified")?;

        // Parse as NaiveDate, then convert to NaiveDateTime at midnight
        let date = NaiveDate::parse_from_str(date_str, date_format)?
            .and_hms_opt(0, 0, 0)
            .ok_or("Failed to create datetime")?;
        let description: String = desc_str.to_string();
        let mut amount: f64 = amount_str.parse()?;

        if !amount_is_standard {
            // The amount is not standard, so we need to invert it
            amount = -amount;
        }

        // If we have meta data that we care about, apply the handler to transform the amount
        if !self.meta_data.is_empty() {
            for (meta_type, meta_data_column_info) in &self.meta_data {
                // Get the current value from the metadata column
                let value_str = record
                    .get(meta_data_column_info.index as usize)
                    .ok_or(format!(
                        "Missing column at index {}",
                        meta_data_column_info.index
                    ))?;

                // Apply the handler with the amount and value string from the meta_type
                meta_type.handle(&mut amount, value_str, record)?;
            }
        }

        // Construct the Expense
        let expense = Expense::new(description, amount, date);

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

#[derive(Serialize, Hash, Eq, PartialEq, Debug, Clone, Copy, Deserialize)]
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
    let mut map: HashMap<CsvDefinitionKey, CsvDefinition> = HashMap::new();

    map.insert(
        CsvDefinitionKey::WellsFargo,
        CsvDefinition::new(
            "Wells Fargo Spending Report",
            false,
            make_column_definitions(&[
                (
                    CsvColumnRole::Date,
                    0,
                    CsvColumnDataType::DateObject("%m/%d/%Y"),
                ),
                (
                    CsvColumnRole::Amount,
                    1,
                    CsvColumnDataType::Float(&INVERSED),
                ),
                (CsvColumnRole::Description, 4, CsvColumnDataType::String),
            ]),
            Vec::new(),
        ),
    );

    map.insert(
        CsvDefinitionKey::CapitalOne,
        CsvDefinition::new(
            "Capital One Spending Report",
            true,
            make_column_definitions(&[
                (CsvColumnRole::Description, 1, CsvColumnDataType::String),
                (
                    CsvColumnRole::Date,
                    2,
                    CsvColumnDataType::DateObject("%m/%d/%Y"),
                ),
                (
                    CsvColumnRole::Amount,
                    4,
                    CsvColumnDataType::Float(&STANDARD),
                ),
            ]),
            Vec::new(),
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
