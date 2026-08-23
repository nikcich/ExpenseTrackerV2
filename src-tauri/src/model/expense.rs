use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Expense {
    id: String,
    description: String,
    amount: f64,
    tags: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    group: Option<String>,
    date: NaiveDateTime,
}

impl Default for Expense {
    fn default() -> Self {
        return Expense {
            id: String::default(),
            description: String::default(),
            amount: f64::default(),
            tags: Vec::default(),
            group: Option::default(),
            date: NaiveDateTime::default(),
        };
    }
}

impl Expense {
    pub fn new(description: String, amount: f64, date: NaiveDateTime) -> Self {
        return Expense {
            id: String::from("0"),
            description: description,
            amount: amount,
            tags: Vec::default(),
            group: Option::default(),
            date: date,
        };
    }

    pub fn add_tag(&mut self, tag: &str) {
        self.tags.push(tag.to_string());
    }

    pub fn set_id(&mut self, id: &str) {
        self.id = id.to_string();
    }

    pub fn set_date(&mut self, date: NaiveDateTime) {
        self.date = date;
    }

    pub fn set_description(&mut self, description: &str) {
        self.description = description.to_string();
    }

    pub fn set_amount(&mut self, amount: f64) {
        self.amount = amount;
    }

    pub fn get_id(&self) -> &str {
        &self.id
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

    pub fn get_tags(&self) -> &Vec<String> {
        &self.tags
    }

    pub fn set_group(&mut self, group: Option<String>) {
        self.group = group;
    }

    pub fn get_group(&self) -> Option<&str> {
        self.group.as_deref()
    }
}
