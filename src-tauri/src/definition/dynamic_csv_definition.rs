use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

use super::csv_definition::{
    Arg, ArgValue, CsvColumnDataType, CsvColumnInfo, CsvColumnRole, CsvDefinition, STANDARD,
};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DynamicCsvDefinition {
    pub id: String,
    pub name: String,
    pub has_headers: bool,
    pub date_column: DynamicColumn,
    pub description_column: DynamicSimpleColumn,
    pub amount_column: DynamicAmountColumn,
    pub tag_column: Option<DynamicSimpleColumn>,
    pub credit_debit_column: Option<DynamicCreditDebitColumn>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DynamicColumn {
    pub index: u8,
    pub format: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DynamicSimpleColumn {
    pub index: u8,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DynamicAmountColumn {
    pub index: u8,
    pub inverted: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DynamicCreditDebitColumn {
    pub index: u8,
    pub credit_query: String,
}

impl From<&DynamicCsvDefinition> for CsvDefinition {
    fn from(dyn_def: &DynamicCsvDefinition) -> Self {
        let mut expected_columns = BTreeMap::new();

        let date_type = if dyn_def.date_column.format.contains("%H") {
            CsvColumnDataType::DateTimeObject(Box::leak(
                dyn_def.date_column.format.clone().into_boxed_str(),
            ))
        } else {
            CsvColumnDataType::DateObject(Box::leak(
                dyn_def.date_column.format.clone().into_boxed_str(),
            ))
        };

        expected_columns.insert(
            CsvColumnRole::Date,
            CsvColumnInfo::required_content(dyn_def.date_column.index, date_type),
        );

        expected_columns.insert(
            CsvColumnRole::Description,
            CsvColumnInfo::required_content(
                dyn_def.description_column.index,
                CsvColumnDataType::String,
            ),
        );

        let sign_ref: &'static bool = if dyn_def.amount_column.inverted {
            &super::csv_definition::INVERSED
        } else {
            &STANDARD
        };

        expected_columns.insert(
            CsvColumnRole::Amount,
            CsvColumnInfo::required_content(
                dyn_def.amount_column.index,
                CsvColumnDataType::Float(sign_ref),
            ),
        );

        if let Some(ref tag) = dyn_def.tag_column {
            expected_columns.insert(
                CsvColumnRole::Tag,
                CsvColumnInfo::optional_content(tag.index, CsvColumnDataType::String),
            );
        }

        let mut def = CsvDefinition::new_from_parts(
            Box::leak(dyn_def.name.clone().into_boxed_str()),
            dyn_def.has_headers,
            expected_columns,
        );

        if let Some(ref cd) = dyn_def.credit_debit_column {
            def = def.add_meta_data_column(
                CsvColumnRole::CreditDebit,
                CsvColumnInfo::required_content(cd.index, CsvColumnDataType::String)
                    .look_for_argument(
                        Arg::CreditDebitQuery,
                        ArgValue::String(cd.credit_query.clone()),
                    ),
            );
        }

        def
    }
}
