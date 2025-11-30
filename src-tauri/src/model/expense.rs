use chrono::NaiveDate;
use std::collections::HashSet;
use uuid::Uuid;

pub struct Expense {
    id: Uuid,
    description: String,
    amount: f64,
    tags: HashSet<String>,
    date: NaiveDate,
}

impl Expense {
    pub fn new(description: String, amount: f64, date: NaiveDate) -> Self {
        return Expense {
            id: Uuid::new_v4(),
            description: description,
            amount: amount,
            tags: HashSet::new(),
            date: date,
        };
    }
}
