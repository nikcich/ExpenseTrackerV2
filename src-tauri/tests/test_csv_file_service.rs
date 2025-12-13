use csv::StringRecord;
use std::collections::HashMap;
use std::f32;
use std::fs::File;
use std::io::Error as IoError;
use std::io::Write;
use std::num::ParseFloatError;
use tempfile::Builder;

use tauri_app_lib::definition::csv_definition::{
    attempt_to_cast, CsvColumnDataType, CsvColumnInfo, CsvColumnRole, CsvDefinition,
    CsvDefinitionKey, CsvParser, CsvValidator, MockCsvValidator, INVERSED, STANDARD,
};
use tauri_app_lib::service::csv_file_service::{
    open_csv_file_and_find_definitions, open_file_from_path,
};

use tempfile::NamedTempFile;

/// Helper function to set up csv definition for test
///
/// Returns:
/// `CsvDefinition` A CSV Definition to test with
fn setup_csv_definition_for_test() -> CsvDefinition {
    return CsvDefinition::new(
        "Test",
        true,
        &[
            (
                CsvColumnRole::Date,
                CsvColumnInfo {
                    index: 0,
                    data_type: CsvColumnDataType::DateObject("%Y-%m-%d"),
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
    );
}

/// Helper function to set up mock csv definition for test
///
/// Returns:
/// `MockCsvValidator` A mocked CSV Definition to test with
fn setup_mock_csv_definition_for_test(success_on_validate: bool) -> Box<MockCsvValidator> {
    let mut mocked_definition = MockCsvValidator::new();
    mocked_definition
        .expect_validate_against_record()
        .return_const(success_on_validate);

    mocked_definition.expect_has_header().return_const(true);

    return Box::new(mocked_definition);
}

/// Helper function to set up mock csv definition hashmap for test
///
/// Returns:
/// `HashMap<CsvDefinitionKey, Box<MockCsvValidator>>` A mocked CSV Definition key to CSV definition map to test with
fn setup_mock_csv_definition_map(
    definition_key: CsvDefinitionKey,
    mocked_definition: Box<MockCsvValidator>,
) -> HashMap<CsvDefinitionKey, Box<dyn CsvValidator>> {
    let mut map = HashMap::new();
    map.insert(definition_key, mocked_definition as Box<dyn CsvValidator>);
    return map;
}

/// Helper function to set up mocked file for test
///
/// Returns:
/// `NamedTempFile` A temp CSV file to test with
fn setup_mocked_file() -> NamedTempFile {
    // Create some arbitrary CSV file with some content
    let mut temp_file = NamedTempFile::new().expect("Test failed: could not create temp file");
    writeln!(temp_file, "column1,column2").expect("Test failed: could not write to temp file");
    writeln!(temp_file, "value1,value2").expect("Test failed: could not write to temp file");

    return temp_file;
}

#[test]
fn test_attempt_to_cast_string_true() {
    // Setup
    let expected: bool = true;

    // Invoke
    let result: bool = attempt_to_cast("Hello", CsvColumnDataType::String);

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_float_ok_1() {
    // Setup
    let expected: bool = true;

    // Invoke
    let result: bool = attempt_to_cast("1.0", CsvColumnDataType::Float(&STANDARD));

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_float_ok_2() {
    // Setup
    let expected: bool = true;

    // Invoke
    let result: bool = attempt_to_cast("1000000.0", CsvColumnDataType::Float(&STANDARD));

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_float_ok_max() {
    // Setup
    let expected: bool = true;

    // Invoke
    let result: bool = attempt_to_cast(
        f32::MAX.to_string().as_str(),
        CsvColumnDataType::Float(&STANDARD),
    );

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_float_ok_min() {
    // Setup
    let expected: bool = true;

    // Invoke
    let result: bool = attempt_to_cast(
        f32::MIN.to_string().as_str(),
        CsvColumnDataType::Float(&STANDARD),
    );

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_float_overflow() {
    // Setup
    let expected: bool = false;
    let overflow_1: f32 = f32::INFINITY;
    let overflow_2: f32 = f32::MAX + f32::MAX;

    assert_eq!(overflow_1, overflow_2); // Max + some large value should end up as INFINITY

    // Invoke
    let result_1: bool = attempt_to_cast(
        overflow_1.to_string().as_str(),
        CsvColumnDataType::Float(&STANDARD),
    );
    let result_2: bool = attempt_to_cast(
        overflow_2.to_string().as_str(),
        CsvColumnDataType::Float(&STANDARD),
    );

    // Analysis
    assert_eq!(expected, result_1);
    assert_eq!(expected, result_2);
}

#[test]
fn test_attempt_to_cast_float_not_a_number() {
    // Setup
    let expected: bool = false;

    // Invoke
    let result: bool = attempt_to_cast("Boo", CsvColumnDataType::Float(&STANDARD));

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_date_ok_format() {
    // Setup
    let expected: bool = true;

    // Invoke
    let result: bool = attempt_to_cast("1999-11-05", CsvColumnDataType::DateObject("%Y-%m-%d"));

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_date_invalid_format_2() {
    // Setup
    let expected: bool = false;

    // Invoke
    let result: bool = attempt_to_cast("1999/11/05", CsvColumnDataType::DateObject("%Y-%m-%d"));

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_date_invalid() {
    // Setup
    let expected: bool = false;

    // Invoke
    let result: bool = attempt_to_cast("Boo", CsvColumnDataType::DateObject("%Y-%m-%d"));

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_validate_csv_record_false() {
    // Setup
    let expected: bool = false;
    let csv_definition_to_test: CsvDefinition = setup_csv_definition_for_test();

    let string_record_to_test: StringRecord = StringRecord::from(vec!["Qball", "Is A", "Sucker"]);

    // Invoke
    let result: bool = csv_definition_to_test.validate_against_record(&string_record_to_test);

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_validate_csv_record_true() {
    // Setup
    let expected: bool = true;
    let csv_definition_to_test: CsvDefinition = setup_csv_definition_for_test();

    let string_record_to_test: StringRecord =
        StringRecord::from(vec!["1999-11-05", "Qball", "1.0"]);

    // Invoke
    let result: bool = csv_definition_to_test.validate_against_record(&string_record_to_test);

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_parse_record_with_valid_data() {
    // Setup
    let csv_definition = setup_csv_definition_for_test();
    let string_record = StringRecord::from(vec!["2023-10-01", "Test Description", "123.45"]);
    let expected_date = "2023-10-01 00:00:00";
    let expected_description = "Test Description";
    let expected_amount = 123.45;

    // Invoke
    let result = csv_definition.parse_record(&string_record);

    // Analysis
    assert!(result.is_ok(), "Expected parsing to succeed");
    let expense = result.unwrap();
    assert_eq!(expense.get_date().to_string(), expected_date);
    assert_eq!(expense.get_description(), expected_description);
    assert_eq!(expense.get_amount(), expected_amount);
}

#[test]
fn test_parse_record_with_missing_date() {
    // Setup
    let csv_definition = setup_csv_definition_for_test();
    let string_record = StringRecord::from(vec!["", "Test Description", "123.45"]); // Missing date

    // Invoke
    let result = csv_definition.parse_record(&string_record);

    // Analysis
    assert!(
        result.is_err(),
        "Expected parsing to fail due to missing date"
    );
    assert_eq!(
        result.unwrap_err().to_string(),
        "Column value is an empty string for required role Date"
    );
}

#[test]
fn test_parse_record_with_missing_description() {
    // Setup
    let csv_definition = setup_csv_definition_for_test();
    let string_record = StringRecord::from(vec!["2023-10-01", "", "123.45"]); // Missing description

    // Invoke
    let result = csv_definition.parse_record(&string_record);

    // Analysis
    assert!(
        result.is_err(),
        "Expected parsing to fail due to missing description"
    );
    assert_eq!(
        result.unwrap_err().to_string(),
        "Column value is an empty string for required role Description"
    );
}

#[test]
fn test_parse_record_with_missing_amount() {
    // Setup
    let csv_definition = setup_csv_definition_for_test();
    let string_record = StringRecord::from(vec!["2023-10-01", "Test Description", ""]); // Missing amount

    // Invoke
    let result = csv_definition.parse_record(&string_record);

    // Analysis
    assert!(
        result.is_err(),
        "Expected parsing to fail due to missing amount"
    );
    assert_eq!(
        result.unwrap_err().to_string(),
        "Column value is an empty string for required role Amount"
    );
}

#[test]
fn test_parse_record_with_invalid_amount() {
    // Setup
    let csv_definition = setup_csv_definition_for_test();
    let string_record = StringRecord::from(vec!["2023-10-01", "Test Description", "invalid"]); // Invalid amount

    // Invoke
    let result = csv_definition.parse_record(&string_record);

    // Analysis
    assert!(
        result.is_err(),
        "Expected parsing to fail due to invalid amount"
    );
    let err = result.unwrap_err();
    assert!(
        err.is::<ParseFloatError>(),
        "Expected error to be ParseFloatError"
    );
}

#[test]
fn test_parse_record_with_optional_field() {
    // Setup
    let mut csv_definition = setup_csv_definition_for_test();
    csv_definition = csv_definition.add_optional_column(
        CsvColumnRole::Tag,
        CsvColumnInfo {
            index: 3,
            data_type: CsvColumnDataType::String,
        },
    );
    let string_record = StringRecord::from(vec![
        "2023-10-01",
        "Test Description",
        "123.45",
        "Optional Tag",
    ]);
    let expected_tag = "Optional Tag";

    // Invoke
    let result = csv_definition.parse_record(&string_record);

    // Analysis
    assert!(
        result.is_ok(),
        "Expected parsing to succeed with optional field"
    );
    let expense = result.unwrap();
    assert!(expense.get_tags().len() == 1);
    assert!(expense.get_tags().contains(&expected_tag.to_string()));
}

#[test]
fn test_parse_record_with_invalid_date_format() {
    // Setup
    let csv_definition = setup_csv_definition_for_test();
    let string_record = StringRecord::from(vec!["01-10-2023", "Test Description", "123.45"]);

    // Invoke
    let result = csv_definition.parse_record(&string_record);

    // Analysis
    assert!(
        result.is_err(),
        "Expected parsing to fail due to invalid date format"
    );
}

#[test]
fn test_parse_record_with_inversed_amount() {
    // Setup
    let csv_definition = CsvDefinition::new(
        "Test Inversed Amount",
        true,
        &[
            (
                CsvColumnRole::Date,
                CsvColumnInfo {
                    index: 0,
                    data_type: CsvColumnDataType::DateObject("%Y-%m-%d"),
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
                    data_type: CsvColumnDataType::Float(&INVERSED),
                },
            ),
        ],
    );
    let string_record = StringRecord::from(vec!["2023-10-01", "Test Description", "123.45"]);
    let expected_amount = -123.45;

    // Invoke
    let result = csv_definition.parse_record(&string_record);

    // Analysis
    assert!(
        result.is_ok(),
        "Expected parsing to succeed with inversed amount"
    );
    let expense = result.unwrap();
    assert_eq!(expense.get_amount(), expected_amount);
}

#[test]
fn test_open_file_from_path_valid_extension() {
    // Setup
    let temp = Builder::new()
        .suffix(".csv")
        .tempfile()
        .expect("Test failed: could not create temp file");

    // Invoke
    let result: Result<File, IoError> = open_file_from_path(temp.path().to_str().unwrap());

    // Analysis
    assert!(result.is_ok());
}

#[test]
fn test_open_file_from_path_invalid_extension() {
    // Setup
    let temp = Builder::new()
        .suffix(".json")
        .tempfile()
        .expect("Test failed: could not create temp file");

    // Invoke
    let result: Result<File, IoError> = open_file_from_path(temp.path().to_str().unwrap());

    // Analysis
    assert!(!result.is_ok());
}

#[test]
fn test_open_file_from_path_fail() {
    // Setup
    let bad_path: &'static str = "invalid/path.txt";

    // Invoke
    let result: Result<File, IoError> = open_file_from_path(&bad_path);

    // Analysis
    assert!(result.is_err());
}

#[test]
fn test_open_csv_and_validate_true() {
    // Setup
    let expected_size: usize = 1;
    let expected_definition_key = CsvDefinitionKey::CapitalOne;
    let success_on_validate: bool = true;
    let mocked_temp_file: NamedTempFile = setup_mocked_file();
    let mocked_definition_as_csv_validator: Box<MockCsvValidator> =
        setup_mock_csv_definition_for_test(success_on_validate);
    let mocked_map =
        setup_mock_csv_definition_map(expected_definition_key, mocked_definition_as_csv_validator);

    // Invoke
    let result = open_csv_file_and_find_definitions(mocked_temp_file.as_file(), &mocked_map);

    // Analysis
    match result {
        Ok(arg) => {
            assert!(arg.is_some(), "Expected Some value");
            assert!(!arg.is_none(), "Expected not None");

            // Verify it's the right key
            let returned_key_list = arg.unwrap();

            assert_eq!(returned_key_list.len(), expected_size);
            assert_eq!(returned_key_list[0], expected_definition_key);
        }
        Err(err) => panic!("Test failed: Result returned an error: {:?}", err),
    }
}

#[test]
fn test_open_csv_and_validate_false() {
    // Setup
    let expected_definition_key = CsvDefinitionKey::CapitalOne;
    let success_on_validate: bool = false;
    let mocked_temp_file: NamedTempFile = setup_mocked_file();
    let mocked_definition_as_csv_validator: Box<MockCsvValidator> =
        setup_mock_csv_definition_for_test(success_on_validate);
    let mocked_map =
        setup_mock_csv_definition_map(expected_definition_key, mocked_definition_as_csv_validator);

    // Invoke
    let result = open_csv_file_and_find_definitions(mocked_temp_file.as_file(), &mocked_map);

    // Analysis
    match result {
        Ok(arg) => {
            // Should return None because no matched definition was found
            assert!(
                arg.is_none(),
                "Expected None when no matched validation was found"
            );
        }
        Err(err) => panic!("Test failed: Result returned an error: {:?}", err),
    }
}
