use std::f32;

use tauri_app_lib::service::csv_file_service;
use tauri_app_lib::service::csv_file_service::CsvColumnDataType;

#[test]
fn test_attempt_to_cast_string_true() {
    // Setup
    let mut result: bool = false;
    let expected: bool = true;

    // Invoke
    result = csv_file_service::attempt_to_cast("Hello", CsvColumnDataType::String);

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_float_ok_1() {
    // Setup
    let mut result: bool = false;
    let expected: bool = true;

    // Invoke
    result = csv_file_service::attempt_to_cast("1.0", CsvColumnDataType::Float);

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_float_ok_2() {
    // Setup
    let mut result: bool = false;
    let expected: bool = true;

    // Invoke
    result = csv_file_service::attempt_to_cast("1000000.0", CsvColumnDataType::Float);

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_float_ok_max() {
    // Setup
    let mut result: bool = false;
    let expected: bool = true;

    // Invoke
    result =
        csv_file_service::attempt_to_cast(f32::MAX.to_string().as_str(), CsvColumnDataType::Float);

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_float_ok_min() {
    // Setup
    let mut result: bool = false;
    let expected: bool = true;

    // Invoke
    result =
        csv_file_service::attempt_to_cast(f32::MIN.to_string().as_str(), CsvColumnDataType::Float);

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
        CsvColumnDataType::Float,
    );

    result_2 = csv_file_service::attempt_to_cast(
        overflow_2.to_string().as_str(),
        CsvColumnDataType::Float,
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
    result = csv_file_service::attempt_to_cast("Boo", CsvColumnDataType::Float);

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_date_ok() {
    // Setup
    let mut result: bool = false;
    let expected: bool = true;

    // Invoke
    result = csv_file_service::attempt_to_cast("1999-11-05", CsvColumnDataType::DateObject);

    // Analysis
    assert_eq!(expected, result);
}

#[test]
fn test_attempt_to_cast_date_invalid() {
    // Setup
    let mut result: bool = true;
    let expected: bool = false;

    // Invoke
    result = csv_file_service::attempt_to_cast("Boo", CsvColumnDataType::DateObject);

    // Analysis
    assert_eq!(expected, result);
}
