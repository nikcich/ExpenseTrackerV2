use crate::model::expense::Expense;
use chrono::NaiveDate;
use csv::StringRecord;
use mockall::automock;
use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap};
use std::error::Error as StdError;

pub const STANDARD: bool = true;
pub const INVERSED: bool = false;

///GLOBAL DEFINITIONS
pub static CSV_DEFINITIONS: Lazy<HashMap<CsvDefinitionKey, CsvDefinition>> =
    Lazy::new(|| build_definitions());

/// ENUM DEFINITIONS

#[repr(u8)]
#[derive(Debug, Hash, Eq, PartialEq, Clone, Copy, Ord, PartialOrd)]
pub enum CsvColumnRole {
    Date,
    Description,
    Amount,
    Tag,
    Currency,
}

impl CsvColumnRole {
    /// Fetches and normalizes a value from a `StringRecord`.
    /// Uses `column_info.is_required` to determine whether missing or empty values are errors.
    /// Returns `Ok(Some(normalized))` if present, `Ok(None)` if optional and missing/empty,
    /// or `Err` if required and missing/empty.
    pub fn get_and_normalize<'a>(
        role_type: Self,
        string_record: &'a StringRecord,
        column_info: &CsvColumnInfo,
    ) -> Result<Option<String>, Box<dyn StdError>> {
        // Fetch the value from the StringRecord
        let value = string_record.get(column_info.index as usize);

        match value {
            Some(val) => {
                let normalized = normalize(val);

                // Check for required column
                if column_info.is_required && normalized.is_empty() {
                    return Err(format!(
                        "Column value is an empty string for required role {:?}",
                        role_type
                    )
                    .into());
                }

                Ok(Some(normalized))
            }
            None => {
                if column_info.is_required {
                    Err(format!(
                        "Missing column in CSV record for required role {:?}",
                        role_type
                    )
                    .into())
                } else {
                    Ok(None)
                }
            }
        }
    }

    pub fn handle(
        self,
        expense: &mut Expense,
        string_record: &StringRecord,
        column_info: &CsvColumnInfo,
        csv_definition: &CsvDefinition,
    ) -> Result<(), Box<dyn StdError>> {
        // Fetch and normalize the value
        let value = match Self::get_and_normalize(self, string_record, column_info)? {
            Some(val) => val,
            None => return Ok(()), // Skip if the value is optional and not present
        };

        // Validate and parse the value
        let parsed_value = validate_and_parse(&value, column_info.data_type)?;

        // Process the parsed value based on the role
        match (self, parsed_value) {
            (CsvColumnRole::Date, ParsedValue::Date(date)) => {
                expense.set_date(date);
            }
            (CsvColumnRole::Description, ParsedValue::String(description)) => {
                expense.set_description(&description);
            }
            (CsvColumnRole::Amount, ParsedValue::Float(amount)) => {
                expense.set_amount(amount);
            }
            (CsvColumnRole::Tag, ParsedValue::String(tag)) => {
                if !tag.is_empty() {
                    expense.add_tag(&tag);
                }
            }
            (CsvColumnRole::Currency, ParsedValue::String(currency)) => {
                if currency == "$" {
                    // Fetch the second amount column definition
                    let second_amount_column_definition = csv_definition
                        .meta_data_columns
                        .get(&CsvColumnRole::Amount)
                        .ok_or("Currency is present in record but does not have second amount column definition to override with!")?;

                    // Fetch and normalize the second amount value
                    if let Some(second_amount_str) = CsvColumnRole::get_and_normalize(
                        CsvColumnRole::Amount,
                        string_record,
                        second_amount_column_definition,
                    )? {
                        // Parse the second amount value
                        if let Ok(ParsedValue::Float(second_amount)) = validate_and_parse(
                            &second_amount_str,
                            second_amount_column_definition.data_type,
                        ) {
                            // Override the original amount with the second amount
                            expense.set_amount(second_amount);
                        }
                    }
                }
            }
            _ => return Err(format!("A role defined in expected columns was received, but there is no handling defined for it, occured at {}:{}", file!(), line!()).into()),
        }

        return Ok(());
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
    index: u8,
    data_type: CsvColumnDataType,
    is_required: bool,
}

impl CsvColumnInfo {
    pub fn optional(index: u8, data_type: CsvColumnDataType) -> Self {
        return Self {
            index: index,
            data_type: data_type,
            is_required: false,
        };
    }
    pub fn required(index: u8, data_type: CsvColumnDataType) -> Self {
        return Self {
            index: index,
            data_type: data_type,
            is_required: true,
        };
    }
}

#[derive(Debug, Clone)]
pub struct CsvDefinition {
    name: &'static str,
    has_headers: bool,
    // All roles in expected columns will be handled in their order by priority
    expected_columns: BTreeMap<CsvColumnRole, CsvColumnInfo>,
    // Any roles in metadata will not be invoked (handler for it)
    meta_data_columns: HashMap<CsvColumnRole, CsvColumnInfo>,
}

impl CsvDefinition {
    pub fn new(
        name: &'static str,
        has_headers: bool,
        expected_columns: &[(CsvColumnRole, CsvColumnInfo)],
    ) -> Self {
        let mut map = BTreeMap::new();
        for &(role, col_info) in expected_columns {
            map.insert(role, col_info);
        }
        return Self {
            name,
            has_headers,
            expected_columns: map,
            meta_data_columns: HashMap::new(),
        };
    }

    pub fn add_meta_data_column(mut self, role: CsvColumnRole, column_info: CsvColumnInfo) -> Self {
        self.meta_data_columns.insert(role, column_info);
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

        // Parse columns in record
        for (role, column_info) in self.expected_columns.iter() {
            let result_parsed = role.handle(&mut expense, record, column_info, self);

            if column_info.is_required {
                // Required, propagate any error
                result_parsed?;
            } else {
                // Optional, ignore error
                let _ = result_parsed;
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
        // Helper function to validate a single column
        fn validate_column_with_record(record: &StringRecord, col_info: &CsvColumnInfo) -> bool {
            let index = col_info.index as usize;

            // Check if the index is invalid (too large for a record)
            if index >= record.len() {
                return false;
            }

            // Fetch the raw value
            let raw_value = record.get(index);
            if raw_value.is_none() {
                return false;
            }

            let normalized_raw_value = normalize(raw_value.unwrap());

            // If the raw value for that column is required but empty string, return false
            if normalized_raw_value.is_empty() && col_info.is_required {
                return false;
            }

            // Lastly, validate by parsing the value (casting it)
            if let Err(_) = validate_and_parse(raw_value.unwrap(), col_info.data_type) {
                return false; // Validation failed
            }

            return true;
        }

        // Validate expected columns
        for (_role, col_info) in &self.expected_columns {
            if !validate_column_with_record(record, col_info) {
                return false;
            }
        }

        // Validate meta data columns
        if !&self.meta_data_columns.is_empty() {
            for (_role, col_info) in &self.meta_data_columns {
                if col_info.is_required && !validate_column_with_record(record, col_info) {
                    return false;
                }
            }
        }

        return true; // All columns are valid
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
                    CsvColumnInfo::required(1, CsvColumnDataType::DateObject("%m/%d/%Y")),
                ),
                (
                    CsvColumnRole::Description,
                    CsvColumnInfo::required(2, CsvColumnDataType::String),
                ),
                (
                    CsvColumnRole::Amount,
                    CsvColumnInfo::required(3, CsvColumnDataType::Float(&STANDARD)),
                ),
                (
                    CsvColumnRole::Tag,
                    CsvColumnInfo::required(0, CsvColumnDataType::String),
                ),
            ],
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
                    CsvColumnInfo::required(0, CsvColumnDataType::DateObject("%m/%d/%Y")),
                ),
                (
                    CsvColumnRole::Amount,
                    CsvColumnInfo::required(1, CsvColumnDataType::Float(&INVERSED)),
                ),
                (
                    CsvColumnRole::Description,
                    CsvColumnInfo::required(4, CsvColumnDataType::String),
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
                    CsvColumnInfo::required(0, CsvColumnDataType::DateObject("%m/%d/%Y")),
                ),
                (
                    CsvColumnRole::Description,
                    CsvColumnInfo::required(1, CsvColumnDataType::String),
                ),
                (
                    CsvColumnRole::Amount,
                    CsvColumnInfo::required(2, CsvColumnDataType::Float(&STANDARD)),
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
                    CsvColumnInfo::required(1, CsvColumnDataType::String),
                ),
                (
                    CsvColumnRole::Date,
                    CsvColumnInfo::required(2, CsvColumnDataType::DateObject("%m/%d/%Y")),
                ),
                (
                    CsvColumnRole::Amount,
                    CsvColumnInfo::required(4, CsvColumnDataType::Float(&STANDARD)),
                ),
            ],
        ),
    );

    return map;
}

/// Enum to represent parsed values
#[derive(Debug, PartialEq)]
pub enum ParsedValue {
    String(String),
    Float(f64),
    Date(chrono::NaiveDateTime),
}

/// Attempts to cast a raw string value to a data type.
///
/// Parameters:
/// - `raw_data`: The raw string value to cast.
/// - `col_data_type`: The target data type to cast to.
///
/// Returns:
/// - `bool`: True if the cast is successful, false otherwise.
pub fn validate_and_parse(
    value: &str,
    data_type: CsvColumnDataType,
) -> Result<ParsedValue, Box<dyn StdError>> {
    match data_type {
        CsvColumnDataType::String => Ok(ParsedValue::String(value.to_string())),
        CsvColumnDataType::Float(is_standard) => {
            let mut parsed = value.parse::<f64>()?;
            if parsed.is_infinite() {
                return Err("Overflow: value is too large to be represented as f64".into());
            }
            if !*is_standard {
                parsed = -parsed;
            }
            Ok(ParsedValue::Float(parsed))
        }
        CsvColumnDataType::DateObject(format) => {
            let date = NaiveDate::parse_from_str(value, format)?
                .and_hms_opt(0, 0, 0)
                .ok_or("Failed to create datetime")?;
            Ok(ParsedValue::Date(date))
        }
    }
}
