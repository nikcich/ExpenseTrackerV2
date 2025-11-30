export const POLL_INTERVAL_MS = 2000;

export enum API {
  GetValue = "store_get_value",
  SetValue = "store_set_value",
  NewWindow = "new_window",
  DateRange = "get_date_range",
  ParseCSV = "open_csv_from_path",
}

export enum KnownStoreKeys {
  MyValue = "my_value",
  Expenses = "expenses",
}

export type Expense = {
  id: string;
  amount: number;
  tags: Tag[];
  date: string;
  description: string;
  source: string;
};

export enum Mode {
  MONTHLY = "MONTHLY",
  DAILY = "DAILY",
  YEARLY = "YEARLY",
}

export enum ExpenseTag {
  Food = "Food",
  Utilities = "Utilities",
  Rent_Mortgage = "Rent/Mortgage",
  Transportation = "Transportation",
  Entertainment = "Entertainment",
  Health_Med = "Health/Med",
  Shopping = "Shopping",
  Savings = "Savings",
  Debt = "Debt",
  Gifts = "Gifts",
  Misc = "Misc.",
  Motorcycle = "Motorcycle",
  Work = "Work",
  Gas = "Gas",
  One_Off = "One Off",
  Insurance = "Insurance",
  Credit_Repayment = "Credit Repayment",
  Vacation_Travel = "Vacation/Travel",
}

export enum NonExpenseTags {
  Income = "Income",
}

export type Tag = ExpenseTag | NonExpenseTags;

export const ALL_EXPENSE_TAGS: Tag[] = Object.values(ExpenseTag) as Tag[];
