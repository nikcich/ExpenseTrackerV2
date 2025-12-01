use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Expense {
    description: String,
    amount: f64,
    tags: Vec<String>,
    date: NaiveDate,
}

impl Expense {
    pub fn new(description: String, amount: f64, date: NaiveDate) -> Self {
        return Expense {
            description: description,
            amount: amount,
            tags: Vec::new(),
            date: date,
        };
    }

    pub fn get_description(&self) -> &str {
        &self.description
    }

    pub fn get_date(&self) -> &NaiveDate {
        &self.date
    }

    pub fn get_amount(&self) -> f64 {
        self.amount
    }
}
