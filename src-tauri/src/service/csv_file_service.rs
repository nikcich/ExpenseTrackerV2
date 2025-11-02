use std::collections::HashMap;

#[derive(Debug, Hash, Eq, PartialEq, Clone, Copy)]
enum CsvColumnRole {
    DATE,
    DESCRIPTION,
    AMOUNT,
}

#[derive(Debug)]
struct CsvColumnInfo {
    index: u8,
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
    columns: &[(CsvColumnRole, u8)],
) -> HashMap<CsvColumnRole, CsvColumnInfo> {
    let mut map = HashMap::new();
    for (role, index) in columns {
        map.insert(*role, CsvColumnInfo { index: *index });
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
                (CsvColumnRole::DATE, 0),
                (CsvColumnRole::DESCRIPTION, 1),
                (CsvColumnRole::AMOUNT, 2),
            ]),
        },
    );

    map.insert(
        CsvDefinitionKey::CapitalOne,
        CsvDefinition {
            name: "Capital One Spending Report",
            has_headers: true,
            expected_columns: make_column_definitions(&[
                (CsvColumnRole::DATE, 0),
                (CsvColumnRole::DESCRIPTION, 1),
                (CsvColumnRole::AMOUNT, 2),
            ]),
        },
    );

    map
}

pub fn initialize_csv_file_service() {
    let definitions = build_definitions();
    let keys = [CsvDefinitionKey::WellsFargo, CsvDefinitionKey::CapitalOne];
    for key in keys {
        println!("{:?} : {:?}", key, definitions.get(&key));
    }
}
