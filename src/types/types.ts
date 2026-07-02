export const POLL_INTERVAL_MS = 2000;

export enum API {
  NewWindow = "new_window",
  DateRange = "get_date_range",
  OpenCSV = "open_csv_from_path",
  ParseCSV = "parse_csv_from_path",
  SetDateRange = "set_date_range",
  UpdateExpense = "update_expense",
  AddManualExpense = "add_expense_manual",
  RemoveExpense = "remove_expense",
  RemoveBulkExpenses = "remove_bulk_expenses",
  UpdateBulkExpenses = "update_bulk_expenses",
  SetJsonValue = "store_set_json_value",
  GetJsonValue = "store_get_json_value",
}

export enum KnownStoreKeys {
  MyValue = "my_value",
  Expenses = "expenses",
  ForecastConfig = "forecast_config",
  RsuVests = "rsu_vests",
  BalanceSnapshots = "balance_snapshots",
}

export type ForecastConfigData = {
  startBalance: number;
  reserve: number;
  startDate: string;
  endDate: string;
  incomeStreams: {
    name?: string;
    amount: number;
    payPeriod: string;
    firstPaycheckDate: string;
    semimonthlyPayday1: number;
    semimonthlyPayday2: number;
    endDate?: string;
  }[];
  expenses: {
    name?: string;
    day: number;
    amount: number;
    period?: string;
    firstDate?: string;
    endDate?: string;
  }[];
};

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
  Retirement = "Retirement",
}

export type Tag = ExpenseTag | NonExpenseTags | string;

export const ALL_TAGS: Tag[] = [
  ...Object.values(ExpenseTag),
  ...Object.values(NonExpenseTags),
];

export type RsuVest = {
  id: string;
  vestDate: string;
  shares: number;
  price: number;
  description: string;
};

export type RsuVestsMap = {
  [id: string]: RsuVest;
};

export type BalanceSnapshot = {
  id: string;
  accountName: string;
  date: string;
  balance: number;
  notes?: string;
  type?: "asset" | "debt";
};

export type BalanceSnapshotsMap = {
  [id: string]: BalanceSnapshot;
};

export type Response<T> = {
  status: number;
  header: string;
  message: T | null;
};
