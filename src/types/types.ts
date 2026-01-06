export const POLL_INTERVAL_MS = 2000;

export enum API {
  GetValue = "store_get_value",
  SetValue = "store_set_value",
  NewWindow = "new_window",
  DateRange = "get_date_range",
  OpenCSV = "open_csv_from_path",
  ParseCSV = "parse_csv_from_path",
  SetDateRange = "set_date_range",
  UpdateExpense = "update_expense",
  AddManualExpense = "add_expense_manual",
  RemoveExpense = "remove_expense",
  UpdateBulkExpenses = "update_bulk_expenses",
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
};

export type StoreExpenseMap = {
  [key: string]: Expense;
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
  Savings = "Savings",
  RSU = "RSU",
  Retirement = "Retirement",
}

export type Tag = ExpenseTag | NonExpenseTags | string;

export const ALL_EXPENSE_TAGS: Tag[] = Object.values(ExpenseTag) as Tag[];

const ALL_TAGS: Tag[] = [
  ...Object.values(ExpenseTag),
  ...Object.values(NonExpenseTags),
];

export const ALL_TAGS_OPTIONS = ALL_TAGS.map((tag) => ({
  value: tag,
  label: tag,
}));

export type Response<T> = {
  status: number;
  header: string;
  message: T | null;
};
