use crate::model::expense::Expense;
use blake3::{Hash, Hasher};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::error::Error as StdError;
use std::sync::Arc;
use tauri::{AppHandle, Manager, Wry};
use tauri_plugin_store::Store;
/// STORE data structure example:
/// {
///     "data" :
///     {
///         uuid1:
///         {
///             "name": "Transaction One"
///             "amount": 100.0,
///             "tags": ["Food"],
///             "date": "2023-01-01"
///         },
///         uuid2:
///         {
///             "name": "Transaction Two"
///             "amount": 200.0,
///             "tags": ["Gas"],
///             "date": "2023-01-01"
///          }
///     }
///
///     NOTE that uuid is generated using: date + desc + amount converted to strings, then hashed
///     In theory, no collission should exist. If duplicates exist, this will be rejected.
/// }

static STORE_NAME: &str = "store_data";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct StoreData {
    pub data: HashMap<Hash, Expense>,
}

impl StoreData {
    /// Generate a deterministic UUID for an Expense based on description, date, and amount
    fn generate_hash_for_new_entry(&self, expense: &Expense) -> Hash {
        loop {
            // Serialize expense fields
            let input = format!(
                "{}:{}:{}",
                expense.get_description(),
                expense.get_date(),
                expense.get_amount()
            );

            // Hash it using Blake3
            let hash = Hasher::new().update(input.as_bytes()).finalize();

            // Ensure uniqueness in store
            if !self.data.contains_key(&hash) {
                return hash;
            }
        }
    }
}

/// Helper struct for backend store operations
pub struct ExpenseStore {
    store: Arc<Store<Wry>>, // Tauri store
}

impl ExpenseStore {
    pub fn new(store: Arc<Store<Wry>>) -> Self {
        Self { store }
    }

    /// This is a dangerous call, UI only should call this when absolutely necessary
    pub fn overwrite_using_json(
        &self,
        json_value: serde_json::Value,
    ) -> Result<bool, Box<dyn StdError>> {
        self.store.set(STORE_NAME, json_value);
        self.store.save()?;
        return Ok(true);
    }

    /// Load the persisted store data
    fn load(&self) -> Result<Option<StoreData>, Box<dyn StdError>> {
        let json_data_from_disk: serde_json::Value = self
            .store
            .get(STORE_NAME)
            .unwrap_or(serde_json::Value::Null);

        if json_data_from_disk.is_null() {
            // Not an error, the disk was just empty and had nothing to load from
            return Ok(None);
        }

        // Deserialize JSON -> StoreData
        let store_data: StoreData = serde_json::from_value(json_data_from_disk)
            .map_err(|err| format!("Failed to deserialize StoreData: {}", err))?;

        Ok(Some(store_data))
    }

    /// Save store data back to the Tauri store
    fn save(&self, data: &StoreData) -> Result<bool, Box<dyn StdError>> {
        // Read only operation
        let json_value: serde_json::Value = serde_json::to_value(data)
            .map_err(|err| format!("Failed to serialize StoreData: {}", err))?;

        // Write to the store
        self.store.set(STORE_NAME, json_value);

        // Persist to disk
        self.store.save()?;

        Ok(true)
    }

    /// Add a new expense
    pub fn add_expense(&self, expense: Expense) -> Result<bool, Box<dyn StdError>> {
        // Load store data
        let mut store_data = match self.load()? {
            Some(data) => data,
            None => StoreData::default(), // create default if nothing is saved
        };

        // Add the new expense
        let hash: Hash = store_data.generate_hash_for_new_entry(&expense);

        // Add to the header
        store_data.data.insert(hash, expense);

        // Save updated store
        self.save(&store_data)?;

        return Ok(true);
    }

    // Removes an expense from store
    pub fn remove_expense(&self, hash: &Hash) -> Result<bool, Box<dyn StdError>> {
        let mut store_data = match self.load()? {
            Some(data) => data,
            None => return Ok(false), // nothing to remove
        };

        if store_data.data.remove(hash).is_some() {
            self.save(&store_data)?; // save only if removed
            Ok(true)
        } else {
            Ok(false) // UUID not found
        }
    }

    pub fn get_all_expense(&self) -> Result<Option<StoreData>, Box<dyn StdError>> {
        let loaded = self.load()?;

        match loaded {
            Some(store_data) => Ok(Some(store_data)),
            None => Ok(None),
        }
    }

    /// Get an expense from store data
    pub fn get_expense(&self, hash: &Hash) -> Result<Option<Expense>, Box<dyn StdError>> {
        let loaded = self.load()?;

        let store_data = match loaded {
            Some(data) => data,
            None => return Ok(None),
        };

        let expense = match store_data.data.get(hash) {
            Some(e) => e,            // found expense
            None => return Ok(None), // not found
        };

        return Ok(Some(expense.clone()));
    }

    /// Check if a UUID exists
    pub fn exists(&self, hash: &Hash) -> Result<bool, Box<dyn StdError>> {
        if let Some(store_data) = self.load()? {
            Ok(store_data.data.contains_key(hash))
        } else {
            Ok(false)
        }
    }
}
