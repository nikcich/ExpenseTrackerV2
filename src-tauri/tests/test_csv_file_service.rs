use chrono::NaiveDate;
use csv::StringRecord;
use std::collections::HashMap;
use std::f32;
use std::fs::File;
use std::io::Error as IoError;
use std::io::Write;
use std::num::ParseFloatError;
use tempfile::Builder;

use tauri_app_lib::definition::csv_definition::{
    validate_and_parse, CsvColumnDataType, CsvColumnInfo, CsvColumnRole, CsvDefinition,
    CsvDefinitionKey, CsvParser, CsvValidator, MockCsvValidator, ParsedValue, INVERSED, STANDARD,
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
                CsvColumnInfo::new(0, CsvColumnDataType::DateObject("%Y-%m-%d")),
            ),
            (
                CsvColumnRole::Description,
                CsvColumnInfo::new(1, CsvColumnDataType::String),
            ),
            (
                CsvColumnRole::Amount,
                CsvColumnInfo::new(2, CsvColumnDataType::Float(&STANDARD)),
            ),
            // Optional Role for test
            (
                CsvColumnRole::Tag,
                CsvColumnInfo::new(3, CsvColumnDataType::String),
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
fn test_validate_and_parse_string_true() {
    // Setup
    let expected = ParsedValue::String("Hello".to_string());

    // Invoke
    let result = validate_and_parse("Hello", CsvColumnDataType::String);

    // Analysis
    assert!(result.is_ok(), "Expected validation to succeed");
    assert_eq!(result.unwrap(), expected);
}

#[test]
fn test_validate_and_parse_float_ok_1() {
    // Setup
    let expected = ParsedValue::Float(1.0);

    // Invoke
    let result = validate_and_parse("1.0", CsvColumnDataType::Float(&STANDARD));

    // Analysis
    assert!(result.is_ok(), "Expected validation to succeed");
    assert_eq!(result.unwrap(), expected);
}

#[test]
fn test_validate_and_parse_float_negative() {
    // Setup
    let expected = ParsedValue::Float(-123.45);

    // Invoke
    let result = validate_and_parse("-123.45", CsvColumnDataType::Float(&STANDARD));

    // Analysis
    assert!(result.is_ok(), "Expected validation to succeed");
    assert_eq!(result.unwrap(), expected);
}

#[test]
fn test_validate_and_parse_float_extremely_large() {
    // Setup
    let large_number = "1.7976931348623157e308"; // Close to f64::MAX
    let expected = ParsedValue::Float(1.7976931348623157e308);

    // Invoke
    let result = validate_and_parse(large_number, CsvColumnDataType::Float(&STANDARD));

    // Analysis
    assert!(
        result.is_ok(),
        "Expected validation to succeed for extremely large number"
    );
    assert_eq!(result.unwrap(), expected);
}

#[test]
fn test_validate_and_parse_float_extremely_small() {
    // Setup
    let small_number = "2.2250738585072014e-308"; // Close to f64::MIN_POSITIVE
    let expected = ParsedValue::Float(2.2250738585072014e-308);

    // Invoke
    let result = validate_and_parse(small_number, CsvColumnDataType::Float(&STANDARD));

    // Analysis
    assert!(
        result.is_ok(),
        "Expected validation to succeed for extremely small number"
    );
    assert_eq!(result.unwrap(), expected);
}

#[test]
fn test_validate_and_parse_float_overflow() {
    // Setup
    let overflow_number = "1.8e308"; // Larger than f64::MAX

    // Invoke
    let result = validate_and_parse(overflow_number, CsvColumnDataType::Float(&STANDARD));

    // Analysis
    assert!(result.is_err(), "Expected validation to fail for overflow");
}

#[test]
fn test_validate_and_parse_float_inversed() {
    // Setup
    let expected = ParsedValue::Float(-123.45);

    // Invoke
    let result = validate_and_parse("123.45", CsvColumnDataType::Float(&INVERSED));

    // Analysis
    assert!(result.is_ok(), "Expected validation to succeed");
    assert_eq!(result.unwrap(), expected);
}

#[test]
fn test_validate_and_parse_float_zero() {
    // Setup
    let expected = ParsedValue::Float(0.0);

    // Invoke
    let result = validate_and_parse("0.0", CsvColumnDataType::Float(&STANDARD));

    // Analysis
    assert!(result.is_ok(), "Expected validation to succeed");
    assert_eq!(result.unwrap(), expected);
}

#[test]
fn test_validate_and_parse_float_ok_2() {
    // Setup
    let expected = ParsedValue::Float(1000000.0);

    // Invoke
    let result = validate_and_parse("1000000.0", CsvColumnDataType::Float(&STANDARD));

    // Analysis
    assert!(result.is_ok(), "Expected validation to succeed");
    assert_eq!(result.unwrap(), expected);
}

#[test]
fn test_validate_and_parse_float_not_a_number() {
    // Invoke
    let result = validate_and_parse("Boo", CsvColumnDataType::Float(&STANDARD));

    // Analysis
    assert!(
        result.is_err(),
        "Expected validation to fail for non-numeric value"
    );
}

#[test]
fn test_validate_and_parse_date_ok_format() {
    // Setup
    let expected = ParsedValue::Date(
        NaiveDate::from_ymd_opt(1999, 11, 5)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
    );

    // Invoke
    let result = validate_and_parse("1999-11-05", CsvColumnDataType::DateObject("%Y-%m-%d"));

    // Analysis
    assert!(result.is_ok(), "Expected validation to succeed");
    assert_eq!(result.unwrap(), expected);
}

#[test]
fn test_validate_and_parse_date_invalid_format_2() {
    // Invoke
    let result = validate_and_parse("1999/11/05", CsvColumnDataType::DateObject("%Y-%m-%d"));

    // Analysis
    assert!(
        result.is_err(),
        "Expected validation to fail for invalid date format"
    );
}

#[test]
fn test_validate_and_parse_date_invalid() {
    // Invoke
    let result = validate_and_parse("Boo", CsvColumnDataType::DateObject("%Y-%m-%d"));

    // Analysis
    assert!(
        result.is_err(),
        "Expected validation to fail for invalid date value"
    );
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
    let csv_definition = setup_csv_definition_for_test();
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
fn test_get_and_normalize_required_present() {
    // Setup
    let string_record = StringRecord::from(vec!["2023-10-01", "Test Description", "123.45"]);
    let column_info = CsvColumnInfo {
        index: 1,
        data_type: CsvColumnDataType::String,
        is_required: true,
    };

    // Invoke
    let result =
        CsvColumnRole::get_and_normalize(CsvColumnRole::Description, &string_record, &column_info);

    // Analysis
    assert!(result.is_ok(), "Expected normalization to succeed");
    assert_eq!(result.unwrap().unwrap(), "Test Description".to_string());
}

#[test]
fn test_get_and_normalize_required_missing() {
    // Setup
    let string_record = StringRecord::from(vec!["2023-10-01", "", "123.45"]); // Missing description
    let column_info = CsvColumnInfo {
        index: 1,
        data_type: CsvColumnDataType::String,
        is_required: true,
    };

    // Invoke
    let result =
        CsvColumnRole::get_and_normalize(CsvColumnRole::Description, &string_record, &column_info);

    // Analysis
    assert!(
        result.is_err(),
        "Expected normalization to fail for missing required field"
    );
    assert_eq!(
        result.unwrap_err().to_string(),
        "Column value is an empty string for required role Description"
    );
}

#[test]
fn test_get_and_normalize_optional_present() {
    // Setup
    let string_record = StringRecord::from(vec!["2023-10-01", "Test Description", "123.45"]);
    let column_info = CsvColumnInfo {
        index: 1,
        data_type: CsvColumnDataType::String,
        is_required: false,
    };

    // Invoke
    let result =
        CsvColumnRole::get_and_normalize(CsvColumnRole::Description, &string_record, &column_info);

    assert!(
        result.is_ok(),
        "The result should be an OK since it is optional"
    );

    let normalized = result.unwrap();

    assert!(
        normalized.is_some(),
        "Expected normalization to succeed as Some"
    );
    assert_eq!(normalized.unwrap(), "Test Description".to_string());
}

#[test]
fn test_get_and_normalize_optional_missing() {
    // Setup
    let string_record = StringRecord::from(vec!["2023-10-01", "", "123.45"]); // Missing description
    let column_info = CsvColumnInfo::new(1, CsvColumnDataType::String);

    // Invoke
    // Tag is an optional role, so it should still pass
    let result = CsvColumnRole::get_and_normalize(CsvColumnRole::Tag, &string_record, &column_info);

    assert!(
        result.is_ok(),
        "The result should be an OK since it is optional"
    );

    let normalized = result.unwrap();

    assert!(
        normalized.is_some(),
        "Expected normalization to succeed as Some"
    );

    assert_eq!(normalized.unwrap(), "".to_string());
}

#[test]
fn test_get_and_normalize_whitespace_normalization() {
    // Setup
    let string_record =
        StringRecord::from(vec!["2023-10-01", "   Test   Description   ", "123.45"]);
    let column_info = CsvColumnInfo {
        index: 1,
        data_type: CsvColumnDataType::String,
        is_required: true,
    };

    // Invoke
    let result =
        CsvColumnRole::get_and_normalize(CsvColumnRole::Description, &string_record, &column_info);

    // Analysis
    assert!(result.is_ok(), "Expected normalization to succeed");

    let normalized = result.unwrap();

    assert!(
        normalized.is_some(),
        "Expected normalization to succeed as Some"
    );
    assert_eq!(normalized.unwrap(), "Test Description".to_string());
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
                CsvColumnInfo::new(0, CsvColumnDataType::DateObject("%Y-%m-%d")),
            ),
            (
                CsvColumnRole::Description,
                CsvColumnInfo::new(1, CsvColumnDataType::String),
            ),
            (
                CsvColumnRole::Amount,
                CsvColumnInfo::new(2, CsvColumnDataType::Float(&INVERSED)),
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
