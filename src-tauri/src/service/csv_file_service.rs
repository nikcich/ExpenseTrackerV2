use csv::ReaderBuilder;
use csv::StringRecord;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::error::Error as StdError;
use std::fs::File;
use std::io::Error as IoError;

#[derive(Debug, Hash, Eq, PartialEq, Clone, Copy)]
enum CsvColumnRole {
    Date,
    Description,
    Amount,
}

#[derive(Debug, Eq, PartialEq, Clone, Copy)]
enum CsvColumnDataType {
    Float,
    String,
    DateObject,
}

#[derive(Debug)]
struct CsvColumnInfo {
    index: u8,
    data_type: CsvColumnDataType,
}

#[derive(Debug)]
struct CsvDefinition {
    name: &'static str,
    has_headers: bool,
    expected_columns: HashMap<CsvColumnRole, CsvColumnInfo>,
}

#[derive(Hash, Eq, PartialEq, Debug)]
enum CsvDefinitionKey {
    WellsFargo,
    CapitalOne,
}

/// Helper function that builds a column map from a list of (role, index) pairs.
fn make_column_definitions(
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

fn build_definitions() -> HashMap<CsvDefinitionKey, CsvDefinition> {
    let mut map = HashMap::new();

    map.insert(
        CsvDefinitionKey::WellsFargo,
        CsvDefinition {
            name: "Wells Fargo Spending Report",
            has_headers: true,
            expected_columns: make_column_definitions(&[
                (CsvColumnRole::Date, 0, CsvColumnDataType::DateObject),
                (CsvColumnRole::Description, 1, CsvColumnDataType::String),
                (CsvColumnRole::Amount, 2, CsvColumnDataType::Float),
            ]),
        },
    );

    map.insert(
        CsvDefinitionKey::CapitalOne,
        CsvDefinition {
            name: "Capital One Spending Report",
            has_headers: true,
            expected_columns: make_column_definitions(&[
                (CsvColumnRole::Date, 0, CsvColumnDataType::DateObject),
                (CsvColumnRole::Description, 1, CsvColumnDataType::String),
                (CsvColumnRole::Amount, 2, CsvColumnDataType::Float),
            ]),
        },
    );

    return map;
}

static CSV_DEFINITIONS: Lazy<HashMap<CsvDefinitionKey, CsvDefinition>> =
    Lazy::new(|| build_definitions());

fn open_csv_file(file: &File) -> Result<(), Box<dyn StdError>> {
    let mut rdr = ReaderBuilder::new().has_headers(false).from_reader(file);

    for result in rdr.records() {
        // The iterator yields Result<StringRecord, Error>, so we check the
        // error here.
        let record = result?;
        println!("{:?}", record);
    }
    Ok(())
}

fn open_file_from_path(path: &str) -> Result<File, IoError> {
    let file = File::open(path)?;
    Ok(file)
}

/// Returns true if the record matches the expected columns in csv_definition
fn validate_csv_record(record: &StringRecord, csv_definition: &CsvDefinition) -> bool {
    // Iterate over expected columns
    for (_role, col_info) in &csv_definition.expected_columns {
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

        // Check data types..
        if (col_info.data_type == CsvColumnDataType::Float) {
            // Cast xyz, handle error by returning false
        } else if (col_info.data_type == CsvColumnDataType::DateObject) {
            // Cast xyz, handle error by returning false
        } else if (col_info.data_type == CsvColumnDataType::String) {
            // Cast xyz, handle error by returning false
        }
    }

    return true;
}
