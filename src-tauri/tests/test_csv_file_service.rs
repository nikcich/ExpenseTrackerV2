use csv::StringRecord;
use std::f32;
use std::fs::File;
use std::io::Error as IoError;
use tauri_app_lib::service::csv_file_service::{self, CsvDefinitionKey};
use tempfile::NamedTempFile;

/// Helper function to set up csv definition for test
///
/// Returns:
/// `CsvDefinition` A CSV Definition to test with
fn setup_csv_definition_for_test() -> csv_file_service::CsvDefinition {
    return csv_file_service::CsvDefinition::new(
        "Test",
        true,
        csv_file_service::make_column_definitions(&[
            (
                csv_file_service::CsvColumnRole::Date,
                0,
                csv_file_service::CsvColumnDataType::DateObject,
            ),
            (
                csv_file_service::CsvColumnRole::Description,
                1,
                csv_file_service::CsvColumnDataType::String,
            ),
            (
                csv_file_service::CsvColumnRole::Amount,
                2,
                csv_file_service::CsvColumnDataType::Float,
            ),
        ]),
    );
}

#[test]
fn test_attempt_to_cast_string_true() {
    // Setup
    let mut result: bool = false;
    let expected: bool = true;

    // Invoke
    result =
        csv_file_service::attempt_to_cast("Hello", csv_file_service::CsvColumnDataType::String);

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_float_ok_1() {
    // Setup
    let mut result: bool = false;
    let expected: bool = true;

    // Invoke
    result = csv_file_service::attempt_to_cast("1.0", csv_file_service::CsvColumnDataType::Float);

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_float_ok_2() {
    // Setup
    let mut result: bool = false;
    let expected: bool = true;

    // Invoke
    result =
        csv_file_service::attempt_to_cast("1000000.0", csv_file_service::CsvColumnDataType::Float);

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_float_ok_max() {
    // Setup
    let mut result: bool = false;
    let expected: bool = true;

    // Invoke
    result = csv_file_service::attempt_to_cast(
        f32::MAX.to_string().as_str(),
        csv_file_service::CsvColumnDataType::Float,
    );

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_float_ok_min() {
    // Setup
    let mut result: bool = false;
    let expected: bool = true;

    // Invoke
    result = csv_file_service::attempt_to_cast(
        f32::MIN.to_string().as_str(),
        csv_file_service::CsvColumnDataType::Float,
    );

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_float_overflow() {
    // Setup
    let mut result_1: bool = true;
    let mut result_2: bool = true;
    let expected: bool = false;
    let overflow_1: f32 = f32::INFINITY;
    let overflow_2: f32 = f32::MAX + f32::MAX;

    assert_eq!(overflow_1, overflow_2); // Max + some large value should end up as INFINITY

    // Invoke
    result_1 = csv_file_service::attempt_to_cast(
        overflow_1.to_string().as_str(),
        csv_file_service::CsvColumnDataType::Float,
    );

    result_2 = csv_file_service::attempt_to_cast(
        overflow_2.to_string().as_str(),
        csv_file_service::CsvColumnDataType::Float,
    );

    // Analysis
    assert_eq!(expected, result_1);
    assert_eq!(expected, result_2);
}

#[test]
fn test_attempt_to_cast_float_not_a_number() {
    // Setup
    let mut result: bool = true;
    let expected: bool = false;

    // Invoke
    result = csv_file_service::attempt_to_cast("Boo", csv_file_service::CsvColumnDataType::Float);

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_date_ok() {
    // Setup
    let mut result: bool = false;
    let expected: bool = true;

    // Invoke
    result = csv_file_service::attempt_to_cast(
        "1999-11-05",
        csv_file_service::CsvColumnDataType::DateObject,
    );

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_date_invalid() {
    // Setup
    let mut result: bool = true;
    let expected: bool = false;

    // Invoke
    result =
        csv_file_service::attempt_to_cast("Boo", csv_file_service::CsvColumnDataType::DateObject);

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_validate_csv_record_false() {
    // Setup
    let expected: bool = false;
    let csv_definition_to_test: csv_file_service::CsvDefinition = setup_csv_definition_for_test();

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
    let csv_definition_to_test: csv_file_service::CsvDefinition = setup_csv_definition_for_test();

    let string_record_to_test: StringRecord =
        StringRecord::from(vec!["1999-11-05", "Qball", "1.0"]);

    // Invoke
    let result: bool = csv_definition_to_test.validate_against_record(&string_record_to_test);

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_open_file_from_path_success() {
    // Setup
    let temp: NamedTempFile = tempfile::NamedTempFile::new().unwrap();

    // Invoke
    let result: Result<File, IoError> =
        csv_file_service::open_file_from_path(temp.path().to_str().unwrap());
    assert!(result.is_ok());
}

#[test]
fn test_open_file_from_path_fail() {
    // Setup
    let bad_path: &'static str = "invalid/path.txt";

    let result: Result<File, IoError> = csv_file_service::open_file_from_path(&bad_path);

    assert!(result.is_err());
}

#[test]
fn test_open_csv_and_validate() {
    let expected_csv_definition_key: CsvDefinitionKey = CsvDefinitionKey::CapitalOne;
}
