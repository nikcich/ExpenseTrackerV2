use csv::StringRecord;
use std::collections::HashMap;
use std::f32;
use std::fs::File;
use std::io::Error as IoError;
use tauri_app_lib::service::csv_file_service::{
    attempt_to_cast, make_column_definitions, open_csv_file, open_file_from_path,
    CsvColumnDataType, CsvColumnRole, CsvDefinition, CsvDefinitionKey, CsvValidator,
    MockCsvValidator,
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
        make_column_definitions(&[
            (CsvColumnRole::Date, 0, CsvColumnDataType::DateObject),
            (CsvColumnRole::Description, 1, CsvColumnDataType::String),
            (CsvColumnRole::Amount, 2, CsvColumnDataType::Float),
        ]),
    );
}

fn setup_mock_csv_definition_for_test(success_on_validate: bool) -> MockCsvValidator {
    let mut mocked_definition = MockCsvValidator::new();
    mocked_definition
        .expect_validate_against_record()
        .return_const(success_on_validate);

    mocked_definition.expect_has_header().return_const(true);

    return mocked_definition;
}

fn setup_mock_csv_definition_map<'a>(
    definition_key: &'a CsvDefinitionKey,
    mocked_definition: &'a Box<dyn CsvValidator>,
) -> HashMap<&'a CsvDefinitionKey, &'a Box<dyn CsvValidator>> {
    let mut map = HashMap::new();
    map.insert(definition_key, mocked_definition);
    map
}

fn setup_mocked_file() -> NamedTempFile {
    use std::io::Write;

    // Create some arbitrary CSV file with some content
    let mut temp_file = NamedTempFile::new().expect("Test failed: could not create temp file");
    writeln!(temp_file, "column1,column2").expect("Test failed: could not write to temp file");
    writeln!(temp_file, "value1,value2").expect("Test failed: could not write to temp file");

    return temp_file;
}

fn assert_same_ptr<T>(a: &T, b: &T) {
    assert!(std::ptr::eq(a, b));
}

#[test]
fn test_attempt_to_cast_string_true() {
    // Setup
    let mut result: bool = false;
    let expected: bool = true;

    // Invoke
    result = attempt_to_cast("Hello", CsvColumnDataType::String);

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_float_ok_1() {
    // Setup
    let mut result: bool = false;
    let expected: bool = true;

    // Invoke
    result = attempt_to_cast("1.0", CsvColumnDataType::Float);

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_float_ok_2() {
    // Setup
    let mut result: bool = false;
    let expected: bool = true;

    // Invoke
    result = attempt_to_cast("1000000.0", CsvColumnDataType::Float);

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_float_ok_max() {
    // Setup
    let mut result: bool = false;
    let expected: bool = true;

    // Invoke
    result = attempt_to_cast(f32::MAX.to_string().as_str(), CsvColumnDataType::Float);

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_float_ok_min() {
    // Setup
    let mut result: bool = false;
    let expected: bool = true;

    // Invoke
    result = attempt_to_cast(f32::MIN.to_string().as_str(), CsvColumnDataType::Float);

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
    result_1 = attempt_to_cast(overflow_1.to_string().as_str(), CsvColumnDataType::Float);

    result_2 = attempt_to_cast(overflow_2.to_string().as_str(), CsvColumnDataType::Float);

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
    result = attempt_to_cast("Boo", CsvColumnDataType::Float);

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_date_ok() {
    // Setup
    let mut result: bool = false;
    let expected: bool = true;

    // Invoke
    result = attempt_to_cast("1999-11-05", CsvColumnDataType::DateObject);

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_date_invalid() {
    // Setup
    let mut result: bool = true;
    let expected: bool = false;

    // Invoke
    result = attempt_to_cast("Boo", CsvColumnDataType::DateObject);

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
fn test_open_file_from_path_success() {
    // Setup
    let temp = tempfile::NamedTempFile::new().expect("Test failed: could not create temp file");

    // Invoke
    let result: Result<File, IoError> = open_file_from_path(temp.path().to_str().unwrap());
    assert!(result.is_ok());
}

#[test]
fn test_open_file_from_path_fail() {
    // Setup
    let bad_path: &'static str = "invalid/path.txt";

    let result: Result<File, IoError> = open_file_from_path(&bad_path);

    assert!(result.is_err());
}

#[test]
fn test_open_csv_and_validate_true() {
    // Setup
    let expected_definition_key = CsvDefinitionKey::CapitalOne;
    let success_on_validate: bool = true;
    let mocked_temp_file: NamedTempFile = setup_mocked_file();
    let mocked_definition_as_csv_validator: Box<dyn CsvValidator> =
        Box::new(setup_mock_csv_definition_for_test(success_on_validate));
    let mocked_map = setup_mock_csv_definition_map(
        &expected_definition_key,
        &mocked_definition_as_csv_validator,
    );

    // Invoke
    let result = open_csv_file(mocked_temp_file.as_file(), &mocked_map);

    // Analysis
    match result {
        Ok(arg) => {
            assert!(arg.is_some(), "Expected Some value");
            assert_eq!(arg, Some(expected_definition_key));

            // Verify it's the same instance in memory
            let returned_key = arg.unwrap();
            let returned_def = mocked_map.get(&returned_key).unwrap();
            let original_def = mocked_map.get(&expected_definition_key).unwrap();

            assert_same_ptr(&**returned_def, &**original_def);
        }
        Err(err) => panic!("Test failed: Result returned an error: {:?}", err),
    }
}
