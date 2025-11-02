#[derive(Debug)]
enum CsvColumnRole {
    DATE,
    DESCRIPTION,
    AMOUNT,
}

#[derive(Debug)]
struct CsvColumnInfo {
    column_role: CsvColumnRole,
    index: u8,
}

#[derive(Debug)]
struct CsvDefinition {
    name: &'static str,
    has_headers: bool,
    expected_columns: [CsvColumnInfo; 3],
}

#[repr(u8)]
#[derive(Clone, Copy, Eq, PartialEq)]
enum CsvDefinitionKey {
    WellsFargo = 0,
    CapitalOne = 1,
}

const CSV_DEFINITIONS: [CsvDefinition; 2] = [
    CsvDefinition {
        name: "Wells Fargo Spending Report",
        has_headers: true,
        expected_columns: [
            CsvColumnInfo {
                column_role: CsvColumnRole::DATE,
                index: 0,
            },
            CsvColumnInfo {
                column_role: CsvColumnRole::DESCRIPTION,
                index: 1,
            },
            CsvColumnInfo {
                column_role: CsvColumnRole::AMOUNT,
                index: 2,
            },
        ],
    },
    CsvDefinition {
        name: "Capital One Spending Report",
        has_headers: true,
        expected_columns: [
            CsvColumnInfo {
                column_role: CsvColumnRole::DATE,
                index: 0,
            },
            CsvColumnInfo {
                column_role: CsvColumnRole::DESCRIPTION,
                index: 1,
            },
            CsvColumnInfo {
                column_role: CsvColumnRole::AMOUNT,
                index: 2,
            },
        ],
    },
];

const fn get_definition(key: CsvDefinitionKey) -> &'static CsvDefinition {
    &CSV_DEFINITIONS[key as u8]
}

fn main() {
    let def = get_definition(CsvDefinitionKey::CapitalOne);
    println!("{:?}", def);
}
