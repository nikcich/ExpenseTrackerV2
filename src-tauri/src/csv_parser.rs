#[tauri::command]
pub fn parse_csv(file: String) {
	println!("Parsing CSV file: {}", file);
}
