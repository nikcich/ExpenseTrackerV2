use crate::model::expense::Expense;
use blake3::Hasher;
use chrono::{DateTime, Utc};
use serde_json::{Map, Value};
use std::collections::HashMap;
use std::error::Error as StdError;
use std::sync::Arc;
use std::time::SystemTime;
use tauri::Wry;
use tauri_plugin_store::Store;

/// All data lives under a single top-level key "store_data":
/// {
///   "expenses": { "<hash>": { ... }, ... },
///   "forecast_config": { ... },
///   ...
/// }
///
/// The UI passes sub-keys ("expenses", "forecast_config", etc.)
/// to read/write within this object.

pub static STORE_DATA_KEY: &str = "store_data";
static EXPENSES_SUB_KEY: &str = "expenses";

pub struct AddedResult {
    pub added_count: u16,
    pub duplicate_count: u16,
}

/// Generate a deterministic hash for an Expense based on description, date, and amount
fn generate_hash_for_new_entry(
    expense: &Expense,
    manual: bool,
) -> Result<String, Box<dyn StdError>> {
    let mut input = format!(
        "{}:{}:{}",
        expense.get_description(),
        expense.get_date(),
        expense.get_amount()
    );

    if manual {
        let datetime: DateTime<Utc> = SystemTime::now().into();
        let formatted_time = datetime.format("%Y-%m-%d %H:%M:%S").to_string();
        input.insert_str(0, &formatted_time);
    }

    let hash = Hasher::new().update(input.as_bytes()).finalize();
    let hash_str = hash.to_hex().to_string();

    Ok(hash_str)
}

/// Helper struct for backend store operations
pub struct ExpenseStore {
    store: Arc<Store<Wry>>,
}

impl ExpenseStore {
    pub fn new(store: Arc<Store<Wry>>) -> Self {
        Self { store }
    }

    fn get_store_data(&self) -> Value {
        self.store.get(STORE_DATA_KEY).unwrap_or(Value::Null)
    }

    fn save_store_data(&self, data: &Value) -> Result<bool, Box<dyn StdError>> {
        self.store.set(STORE_DATA_KEY, data.clone());
        self.store.save()?;
        Ok(true)
    }

    fn load_expenses(&self) -> Result<Option<HashMap<String, Expense>>, Box<dyn StdError>> {
        let store_data = self.get_store_data();

        if store_data.is_null() {
            return Ok(None);
        }

        let expenses = store_data.get(EXPENSES_SUB_KEY);

        let expenses = match expenses {
            Some(Value::Object(_)) => expenses.unwrap(),
            _ => return Ok(None),
        };

        let data: HashMap<String, Expense> = serde_json::from_value(expenses.clone())
            .map_err(|err| format!("Failed to deserialize expenses: {}", err))?;

        Ok(Some(data))
    }

    fn save_expenses(&self, data: &HashMap<String, Expense>) -> Result<bool, Box<dyn StdError>> {
        let mut store_data = self.get_store_data();

        if !store_data.is_object() {
            store_data = Value::Object(Map::new());
        }

        let json_value: Value = serde_json::to_value(data)
            .map_err(|err| format!("Failed to serialize expenses: {}", err))?;

        store_data
            .as_object_mut()
            .ok_or("store_data is not an object")?
            .insert(EXPENSES_SUB_KEY.to_string(), json_value);

        self.save_store_data(&store_data)
    }

    pub fn add_expense_as_batch(
        &self,
        expense_batch: Vec<Expense>,
        manual: bool,
    ) -> Result<AddedResult, Box<dyn StdError>> {
        let mut data = self.load_expenses()?.unwrap_or_default();

        let mut result = AddedResult {
            added_count: 0,
            duplicate_count: 0,
        };

        for mut expense in expense_batch {
            let hash: String = generate_hash_for_new_entry(&expense, manual)?;

            expense.set_id(&hash);

            if data.contains_key(&hash) {
                println!(
                    "Duplicate expense found for Date: {}, Description: {}, Amount: {}",
                    expense.get_date(),
                    expense.get_description(),
                    expense.get_amount()
                );
                result.duplicate_count += 1;
                continue;
            }

            data.insert(hash, expense);
            result.added_count += 1;
        }

        if result.added_count > 0 {
            self.save_expenses(&data)?;
        }

        Ok(result)
    }

    pub fn add_expense(
        &self,
        mut expense: Expense,
        manual: bool,
    ) -> Result<bool, Box<dyn StdError>> {
        let mut data = self.load_expenses()?.unwrap_or_default();

        let hash: String = generate_hash_for_new_entry(&expense, manual)?;
        expense.set_id(&hash);

        if data.contains_key(&hash) {
            println!(
                "Duplicate expense found for Date: {}, Description: {}, Amount: {}",
                expense.get_date(),
                expense.get_description(),
                expense.get_amount()
            );
            return Ok(false);
        }

        data.insert(hash, expense);
        self.save_expenses(&data)?;

        Ok(true)
    }

    pub fn remove_expense(&self, hash: &String) -> Result<bool, Box<dyn StdError>> {
        let mut data = match self.load_expenses()? {
            Some(data) => data,
            None => return Ok(false),
        };

        if data.remove(hash).is_some() {
            self.save_expenses(&data)?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    pub fn remove_bulk_expenses(&self, hashes: Vec<String>) -> Result<bool, Box<dyn StdError>> {
        let mut data = match self.load_expenses()? {
            Some(data) => data,
            None => return Err("Store data is null, could not load it to update expense".into()),
        };

        let missing_hashes: Vec<String> = hashes
            .iter()
            .filter(|h| !data.contains_key(*h))
            .cloned()
            .collect();

        if !missing_hashes.is_empty() {
            return Err(format!(
                "The following expenses do not exist: {}",
                missing_hashes.join(", ")
            )
            .into());
        }

        for hash in hashes.iter() {
            data.remove(hash)
                .ok_or_else(|| format!("Failed to remove expense with hash: {}", hash))?;
        }

        self.save_expenses(&data)?;

        Ok(true)
    }

    pub fn get_all_expense(&self) -> Result<Option<HashMap<String, Expense>>, Box<dyn StdError>> {
        self.load_expenses()
    }
    pub fn get_expense(&self, hash: &String) -> Result<Option<Expense>, Box<dyn StdError>> {
        let data = match self.load_expenses()? {
            Some(data) => data,
            None => return Ok(None),
        };

        Ok(data.get(hash).cloned())
    }

    pub fn exists(&self, hash: &String) -> Result<bool, Box<dyn StdError>> {
        Ok(self
            .load_expenses()?
            .map_or(false, |data| data.contains_key(hash)))
    }

    pub fn update_bulk_expenses(
        &self,
        hashes: Vec<String>,
        expenses: Vec<Expense>,
    ) -> Result<bool, Box<dyn StdError>> {
        let mut data = match self.load_expenses()? {
            Some(data) => data,
            None => return Err("Store data is null, could not load it to update expense".into()),
        };

        let missing_hashes: Vec<String> = hashes
            .iter()
            .filter(|h| !data.contains_key(*h))
            .cloned()
            .collect();

        if !missing_hashes.is_empty() {
            return Err(format!(
                "The following expenses do not exist: {}",
                missing_hashes.join(", ")
            )
            .into());
        }

        for (hash, expense) in hashes.iter().zip(expenses.iter()) {
            if data.insert(hash.to_string(), expense.clone()).is_none() {
                return Err(format!("Failed to update expense with hash: {}", hash).into());
            }
        }

        self.save_expenses(&data)?;

        Ok(true)
    }

    pub fn set_json_value(&self, key: &str, value: Value) -> Result<(), Box<dyn StdError>> {
        let mut store_data = self.get_store_data();

        if !store_data.is_object() {
            store_data = Value::Object(Map::new());
        }

        store_data
            .as_object_mut()
            .ok_or("store_data is not an object")?
            .insert(key.to_string(), value);

        self.save_store_data(&store_data)?;
        Ok(())
    }

    pub fn get_json_value(&self, key: &str) -> Result<Option<Value>, Box<dyn StdError>> {
        let store_data = self.get_store_data();

        if store_data.is_null() {
            return Ok(None);
        }

        Ok(store_data.get(key).cloned())
    }

    pub fn update_expense(
        &self,
        hash: String,
        expense: Expense,
    ) -> Result<bool, Box<dyn StdError>> {
        let mut data = match self.load_expenses()? {
            Some(data) => data,
            None => return Err("Store data is null, could not load it to update expense".into()),
        };

        if !data.contains_key(&hash) {
            return Ok(false);
        }

        if hash != expense.get_id() {
            return Err(
                "Expense ID must have the same value as the hash, please check the ID before updating".into(),
            );
        }

        data.insert(hash, expense);
        self.save_expenses(&data)?;

        Ok(true)
    }
}
