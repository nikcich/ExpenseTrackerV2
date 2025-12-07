use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Expense {
    id: String,
    description: String,
    amount: f64,
    tags: Vec<String>,
    date: NaiveDateTime,
}

impl Expense {
    pub fn new(description: String, amount: f64, date: NaiveDateTime) -> Self {
        return Expense {
            id: "0".to_string(),
            description: description,
            amount: amount,
            tags: Vec::new(),
            date: date,
        };
    }

    pub fn set_id(&mut self, id: &String) {
        self.id = id.clone();
    }

    pub fn get_description(&self) -> &str {
        &self.description
    }

    pub fn get_date(&self) -> &NaiveDateTime {
        &self.date
    }

    pub fn get_amount(&self) -> f64 {
        self.amount
    }
}
