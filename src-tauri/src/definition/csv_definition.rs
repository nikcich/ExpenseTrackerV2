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
    Tag,          // A column that serves as the tag indicator
    Currency,     // A column that serves as the currency indicator
    CreditAmount, // A column that serves as the credit amount (stores the amount as a float)
    CreditDebit, // A column that serves as the credit/debit indicator (string that says "Credit" or "Debit")
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
        current_column_info: &CsvColumnInfo,
        meta_data_columns: &HashMap<CsvColumnRole, CsvColumnInfo>,
    ) -> Result<(), Box<dyn StdError>> {
        // Fetch and normalize the value
        let value = match Self::get_and_normalize(self, string_record, current_column_info)? {
            Some(val) => val,
            None => return Ok(()), // Skip if the value is optional and not present
        };

        // Validate and parse the value
        let parsed_value: ParsedValue = cast_raw_value(&value, &current_column_info)?;

        // Process the parsed value based on the role
        match (self, parsed_value) {
            (CsvColumnRole::Date, ParsedValue::Date(date)) => {
                expense.set_date(date);
            }
            (CsvColumnRole::Description, ParsedValue::String(description)) => {
                expense.set_description(&description);
            }
            (CsvColumnRole::Amount, ParsedValue::Float(mut total_amount)) => {
                // Special handling for optional amount in conjunction with credit column
                if !current_column_info.is_required {
                    if let Some(credit_column_info) = meta_data_columns.get(&CsvColumnRole::CreditAmount) {
                        if let Ok(Some(credit_str)) = Self::get_and_normalize(CsvColumnRole::CreditAmount, &string_record, credit_column_info) {
                            if let Ok(ParsedValue::Float(credit)) = cast_raw_value(&credit_str, credit_column_info) {
                                // Credit is treated as a negative amount
                                total_amount = -credit;
                            }
                        }
                    }
                }

                // Handle required amount column with CreditDebit metadata column
                if current_column_info.is_required {
                    if let Some(credit_column_info) = meta_data_columns.get(&CsvColumnRole::CreditDebit) {
                        if let Some(credit_raw_str) = Self::get_and_normalize(CsvColumnRole::CreditDebit, &string_record, credit_column_info)? {
                            if let Ok(ParsedValue::String(credit_str)) = cast_raw_value(&credit_raw_str, credit_column_info) {
                                if let Some(expected_str) = credit_column_info.args.get(0) {
                                    if &credit_str == expected_str {
                                        total_amount = -total_amount;
                                    }
                                }
                            }
                        }
                    }
                }

                // Guard amount cannot be zero after processing
                if !current_column_info.is_required && total_amount.is_nan() {
                    return Err("Amount encountered as NaN, something went horribly wrong".into());
                }

                expense.set_amount(total_amount);
            }
            (CsvColumnRole::Tag, ParsedValue::String(tag)) => {
                if !tag.is_empty() {
                    expense.add_tag(&tag);
                }
            }
            (CsvColumnRole::Currency, ParsedValue::String(currency)) => {
                if currency == "$" {
                    // Fetch the second amount column definition
                    let second_amount_column_definition =
                        meta_data_columns
                        .get(&CsvColumnRole::Amount)
                        .ok_or("Currency is present in record but does not have second amount column definition to override with!")?;

                    // Fetch and normalize the second amount value
                    if let Some(second_amount_str) = CsvColumnRole::get_and_normalize(
                        CsvColumnRole::Amount,
                        string_record,
                        second_amount_column_definition,
                    )? {
                        // Parse the second amount value
                        if let Ok(ParsedValue::Float(second_amount)) = cast_raw_value(
                            &second_amount_str,
                            &second_amount_column_definition,
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

#[derive(Debug, Clone)]
pub struct CsvColumnInfo {
    index: u8,
    data_type: CsvColumnDataType,
    is_required: bool,
    args: Vec<String>,
}

impl CsvColumnInfo {
    pub fn with_temporary_required_state<F>(&mut self, f: F)
    where
        F: FnOnce(&mut Self),
    {
        let original_state = self.is_required;
        self.is_required = true;
        f(self); // Execute the closure with the temporary state
        self.is_required = original_state; // Reset the state
    }

    pub fn add_argument(mut self, arg: String) -> Self {
        self.args.push(arg);
        return self;
    }

    pub fn optional_content(index: u8, data_type: CsvColumnDataType) -> Self {
        return Self {
            index: index,
            data_type: data_type,
            is_required: false,
            args: Vec::new(),
        };
    }
    pub fn required_content(index: u8, data_type: CsvColumnDataType) -> Self {
        return Self {
            index: index,
            data_type: data_type,
            is_required: true,
            args: Vec::new(),
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
        expected_columns: Vec<(CsvColumnRole, CsvColumnInfo)>,
    ) -> Self {
        let expected_columns = expected_columns.iter().cloned().collect::<BTreeMap<_, _>>();
        return Self {
            name,
            has_headers,
            expected_columns: expected_columns,
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
            let result_parsed =
                role.handle(&mut expense, record, column_info, &self.meta_data_columns);

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

            // Lastly, validate by casting the raw value
            if let Err(_) = cast_raw_value(raw_value.unwrap(), &col_info) {
                return false; // Casting failed
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
    CapitalOneSavorOne,
    BankLeumi,
    Max,
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
            vec![
                (
                    CsvColumnRole::Date,
                    CsvColumnInfo::required_content(1, CsvColumnDataType::DateObject("%m/%d/%Y")),
                ),
                (
                    CsvColumnRole::Description,
                    CsvColumnInfo::required_content(2, CsvColumnDataType::String),
                ),
                (
                    CsvColumnRole::Amount,
                    CsvColumnInfo::required_content(3, CsvColumnDataType::Float(&STANDARD)),
                ),
                (
                    CsvColumnRole::Tag,
                    CsvColumnInfo::optional_content(0, CsvColumnDataType::String),
                ),
            ],
        ),
    );

    map.insert(
        CsvDefinitionKey::WellsFargo,
        CsvDefinition::new(
            "Wells Fargo Spending Report",
            false,
            vec![
                (
                    CsvColumnRole::Date,
                    CsvColumnInfo::required_content(0, CsvColumnDataType::DateObject("%m/%d/%Y")),
                ),
                (
                    CsvColumnRole::Amount,
                    CsvColumnInfo::required_content(1, CsvColumnDataType::Float(&INVERSED)),
                ),
                (
                    CsvColumnRole::Description,
                    CsvColumnInfo::required_content(4, CsvColumnDataType::String),
                ),
            ],
        ),
    );

    map.insert(
        CsvDefinitionKey::Amex,
        CsvDefinition::new(
            "American Express Credit Spending Report",
            true,
            vec![
                (
                    CsvColumnRole::Date,
                    CsvColumnInfo::required_content(0, CsvColumnDataType::DateObject("%m/%d/%Y")),
                ),
                (
                    CsvColumnRole::Description,
                    CsvColumnInfo::required_content(1, CsvColumnDataType::String),
                ),
                (
                    CsvColumnRole::Amount,
                    CsvColumnInfo::required_content(2, CsvColumnDataType::Float(&STANDARD)),
                ),
            ],
        ),
    );

    map.insert(
        CsvDefinitionKey::CapitalOne,
        CsvDefinition::new(
            "Capital One Spending Report",
            true,
            vec![
                (
                    CsvColumnRole::Description,
                    CsvColumnInfo::required_content(1, CsvColumnDataType::String),
                ),
                (
                    CsvColumnRole::Date,
                    CsvColumnInfo::required_content(2, CsvColumnDataType::DateObject("%m/%d/%Y")),
                ),
                (
                    CsvColumnRole::Amount,
                    CsvColumnInfo::required_content(4, CsvColumnDataType::Float(&STANDARD)),
                ),
            ],
        )
        .add_meta_data_column(
            CsvColumnRole::CreditDebit,
            CsvColumnInfo::required_content(3, CsvColumnDataType::String),
        ),
    );

    map.insert(
        CsvDefinitionKey::CapitalOneSavorOne,
        CsvDefinition::new(
            "Capital One Savor One Spending Report",
            true,
            vec![
                (
                    CsvColumnRole::Date,
                    CsvColumnInfo::required_content(0, CsvColumnDataType::DateObject("%Y-%m-%d")),
                ),
                (
                    CsvColumnRole::Description,
                    CsvColumnInfo::required_content(3, CsvColumnDataType::String),
                ),
                (
                    CsvColumnRole::Amount,
                    CsvColumnInfo::optional_content(5, CsvColumnDataType::Float(&STANDARD)),
                ),
            ],
        )
        .add_meta_data_column(
            CsvColumnRole::CreditAmount,
            CsvColumnInfo::optional_content(6, CsvColumnDataType::Float(&INVERSED)),
        ),
    );

    map.insert(
        CsvDefinitionKey::BankLeumi,
        CsvDefinition::new(
            "Bank Leumi Spending Report",
            true,
            vec![
                (
                    CsvColumnRole::Date,
                    CsvColumnInfo::required_content(0, CsvColumnDataType::DateObject("%d/%m/%y")),
                ),
                (
                    CsvColumnRole::Description,
                    CsvColumnInfo::required_content(1, CsvColumnDataType::String),
                ),
                (
                    CsvColumnRole::Amount,
                    CsvColumnInfo::optional_content(3, CsvColumnDataType::Float(&STANDARD)),
                ),
            ],
        )
        .add_meta_data_column(
            CsvColumnRole::CreditAmount,
            CsvColumnInfo::optional_content(4, CsvColumnDataType::Float(&INVERSED)),
        ),
    );

    map.insert(
        CsvDefinitionKey::Max,
        CsvDefinition::new(
            "Max Spending Report",
            true,
            vec![
                (
                    CsvColumnRole::Date,
                    CsvColumnInfo::required_content(0, CsvColumnDataType::DateObject("%d-%m-%Y")),
                ),
                (
                    CsvColumnRole::Description,
                    CsvColumnInfo::required_content(1, CsvColumnDataType::String),
                ),
                (
                    CsvColumnRole::Amount,
                    CsvColumnInfo::required_content(5, CsvColumnDataType::Float(&STANDARD)),
                ),
                (
                    CsvColumnRole::Currency,
                    CsvColumnInfo::optional_content(8, CsvColumnDataType::String),
                ),
            ],
        )
        .add_meta_data_column(
            CsvColumnRole::Amount,
            CsvColumnInfo::required_content(7, CsvColumnDataType::Float(&STANDARD)),
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
pub fn cast_raw_value(
    value: &str,
    col_info: &CsvColumnInfo,
) -> Result<ParsedValue, Box<dyn StdError>> {
    match col_info.data_type {
        CsvColumnDataType::String => Ok(ParsedValue::String(value.to_string())),
        CsvColumnDataType::Float(is_standard) => {
            let mut parsed;

            if col_info.is_required {
                parsed = value.parse::<f64>()?;
            } else {
                parsed = value.parse::<f64>().unwrap_or(f64::NAN);
            }

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
