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
pub const SHEKEL_TO_DOLLAR_DIVISION: f64 = 3.5;

///GLOBAL DEFINITIONS
pub static CSV_DEFINITIONS: Lazy<HashMap<CsvDefinitionKey, CsvDefinition>> =
    Lazy::new(|| build_definitions());

/// ENUM DEFINITIONS

#[derive(Debug, Hash, Eq, PartialEq, Clone, Copy)]
pub enum CsvColumnRole {
    Date,
    Description,
    Amount,
<<<<<<< Updated upstream
    Tag,
=======
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

    pub fn handle_parsed_str(
        self,
        expense: &mut Expense,
        string_record: &StringRecord,
        current_column_info: &CsvColumnInfo,
        meta_data_columns: &HashMap<CsvColumnRole, CsvColumnInfo>,
    ) -> Result<(), Box<dyn StdError>> {
        // Fetch and normalize the value
        let value = match Self::get_and_normalize(self, &string_record, &current_column_info)? {
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
                        credit_column_info.clone().with_temporary_required_state(|credit_info| {
                            if let Ok(Some(credit_str)) = Self::get_and_normalize(CsvColumnRole::CreditAmount, &string_record, &credit_info) {
                                if let Ok(ParsedValue::Float(credit)) = cast_raw_value(&credit_str, &credit_info) {
                                    // Credit is treated as a negative amount (no negative sign here because credit amount is inversed)
                                    total_amount = credit;
                                }
                            }
                        });
                    }
                }

                // Handle required amount column with CreditDebit metadata column
                if current_column_info.is_required {
                    if let Some(credit_column_info) = meta_data_columns.get(&CsvColumnRole::CreditDebit) {
                        if let Some(credit_raw_str) = Self::get_and_normalize(CsvColumnRole::CreditDebit, &string_record, credit_column_info)? {
                            if let Ok(ParsedValue::String(credit_str)) = cast_raw_value(&credit_raw_str, credit_column_info) {
                            if let Some(query) = credit_column_info.args_to_check.get(&Arg::CreditDebitQuery) {
                                    if let ArgValue::String(query_str) = query {
                                        if &credit_str == query_str{
                                            total_amount = -total_amount;
                                        }
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

                // If the amount is in Shekel, divide it by the exchange rate.
                // This will be overwritten by Currency column by priority order iteration.
                if let Some(currency) = current_column_info.args_to_check.get(&Arg::AmountDefaultCurrency) {
                    if let ArgValue::Currency(currency_enum) = currency {
                        if currency_enum == &Currency::Shekel {
                            expense.set_amount(total_amount / SHEKEL_TO_DOLLAR_DIVISION);
                        }
                    }
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
                    } else {
                        // There's no dollar amount, so convert shekel amount to dollars
                        let shekel_amount = expense.get_amount();
                        expense.set_amount(shekel_amount / SHEKEL_TO_DOLLAR_DIVISION);
                    }
                }
            }
            _ => return Err(format!("A role defined in expected columns was received, but there is no handling defined for it, occured at {}:{}", file!(), line!()).into()),
        }

        return Ok(());
    }
>>>>>>> Stashed changes
}

#[derive(Debug, Eq, PartialEq, Clone, Copy)]
pub enum CsvColumnDataType {
    Float(&'static bool), // True if standard, False if inversed sign
    String,
    DateObject(&'static str), // Format string for parsing dates
    OptionalString,
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
<<<<<<< Updated upstream
=======
    is_required: bool,
    args_to_check: HashMap<Arg, ArgValue>,
}

#[repr(u8)]
#[derive(Debug, PartialEq, Eq, Clone, Hash)]
pub enum Currency {
    Dollar,
    Shekel,
}

#[repr(u8)]
#[derive(Debug, PartialEq, Eq, Clone, Hash)]
pub enum ArgValue {
    String(String),
    Currency(Currency),
    Bool(bool),
}

#[repr(u8)]
#[derive(Hash, Eq, PartialEq, Debug, Clone)]
pub enum Arg {
    AmountDefaultCurrency,
    CreditDebitQuery,
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

    pub fn look_for_argument(mut self, arg: Arg, arg_value: ArgValue) -> Self {
        self.args_to_check.insert(arg, arg_value);
        return self;
    }

    pub fn optional_content(index: u8, data_type: CsvColumnDataType) -> Self {
        return Self {
            index: index,
            data_type: data_type,
            is_required: false,
            args_to_check: HashMap::new(),
        };
    }
    pub fn required_content(index: u8, data_type: CsvColumnDataType) -> Self {
        return Self {
            index: index,
            data_type: data_type,
            is_required: true,
            args_to_check: HashMap::new(),
        };
    }
>>>>>>> Stashed changes
}

#[derive(Debug, Clone)]
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
        let description: String = normalize(&desc_str).to_string();
        let mut amount: f64 = amount_str.parse()?;

        if !amount_is_standard {
            // The amount is not standard, so we need to invert it
            amount = -amount;
        }

        // Construct the Expense
        let mut expense = Expense::new(description, amount, date);

        let tag_info: Option<&CsvColumnInfo> = self.expected_columns.get(&CsvColumnRole::Tag);

        if tag_info.is_some() {
            // There is some tags, we need to extract the tag strings from the StringRecord
            let tags_str: Option<&str> = record.get(tag_info.unwrap().index as usize);

            if tags_str.is_some() {
                expense.add_tag(tags_str.unwrap());
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
                if (col_info.data_type == CsvColumnDataType::OptionalString) {
                    continue;
                }

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
        CsvDefinitionKey::ExpenseTrackerV1,
        CsvDefinition::new(
            "Expense Tracker V1 Migration Report",
            true,
            make_column_definitions(&[
                (CsvColumnRole::Tag, 0, CsvColumnDataType::OptionalString),
                (
                    CsvColumnRole::Date,
                    1,
                    CsvColumnDataType::DateObject("%m/%d/%Y"),
                ),
                (CsvColumnRole::Description, 2, CsvColumnDataType::String),
                (
                    CsvColumnRole::Amount,
                    3,
                    CsvColumnDataType::Float(&STANDARD),
                ),
            ]),
        ),
    );

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
        ),
    );

    map.insert(
        CsvDefinitionKey::Amex,
        CsvDefinition::new(
            "American Express Credit Spending Report",
            true,
            make_column_definitions(&[
                (
                    CsvColumnRole::Date,
                    0,
                    CsvColumnDataType::DateObject("%m/%d/%Y"),
                ),
                (CsvColumnRole::Description, 1, CsvColumnDataType::String),
                (
                    CsvColumnRole::Amount,
                    2,
                    CsvColumnDataType::Float(&STANDARD),
                ),
            ]),
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
<<<<<<< Updated upstream
            ]),
=======
            ],
        )
        .add_meta_data_column(
            CsvColumnRole::CreditDebit,
            CsvColumnInfo::required_content(3, CsvColumnDataType::String).look_for_argument(
                Arg::CreditDebitQuery,
                ArgValue::String("Credit".to_string()),
            ),
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
>>>>>>> Stashed changes
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
        CsvColumnDataType::OptionalString => {
            if raw_data.is_empty() {
                return true;
            } else {
                return true;
            }
        }
    }
}
