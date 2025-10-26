export const POLL_INTERVAL_MS = 2000;

export enum API {
  GetValue = "store_get_value",
  SetValue = "store_set_value",
  NewWindow = "new_window",
  DateRange = "get_date_range",
}

export enum KnownStoreKeys {
  MyValue = "my_value",
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

export enum Tag {
  Food = "Food",
  Utilities = "Utilities",
  Rent_Mortgage = "Rent/Mortgage",
  Transportation = "Transportation",
  Entertainment = "Entertainment",
  Health_Med = "Health/Med",
  Shopping = "Shopping",
  Savings = "Savings",
  Income = "Income",
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

export const ALL_TAGS: Tag[] = Object.values(Tag) as Tag[];
