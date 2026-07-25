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
  SaveCSV = "save_csv_to_path",
  ReadCSVPreview = "read_csv_preview",
  PreviewParseCSV = "preview_csv_parse",
  ExportAllData = "export_all_data",
  ImportAllData = "import_all_data",
  ReadTextFile = "read_text_file",
}

export enum KnownStoreKeys {
  MyValue = "my_value",
  Expenses = "expenses",
  ForecastConfig = "forecast_config",
  Stocks = "stocks",
  Grants = "grants",
  RsuVests = "rsu_vests",
  Sales = "sales",
  BalanceSnapshots = "balance_snapshots",
  CustomCsvDefinitions = "custom_csv_definitions",
  SsdiPayPeriods = "ssdi_pay_periods",
  SsdiConfig = "ssdi_config",
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
}

export type Tag = ExpenseTag | NonExpenseTags | string;

export const ALL_TAGS: Tag[] = [
  ...Object.values(ExpenseTag),
  ...Object.values(NonExpenseTags),
];

export type Stock = {
  id: string;
  ticker: string;
  currentPrice: number;
};

export type StockMap = {
  [id: string]: Stock;
};

export type Grant = {
  id: string;
  name: string;
  stockId: string;
  grantPrice: number;
  totalShares: number;
};

export type GrantMap = {
  [id: string]: Grant;
};

export type RsuVest = {
  id: string;
  grantId: string;
  vestDate: string;
  shares: number;
  basisPrice: number;
};

export type RsuVestsMap = {
  [id: string]: RsuVest;
};

export type Sale = {
  id: string;
  stockId: string;
  date: string;
  shares: number;
  salePrice: number;
  basisPrice: number;
};

export type SalesMap = {
  [id: string]: Sale;
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

export type DynamicCsvDefinition = {
  id: string;
  name: string;
  hasHeaders: boolean;
  dateColumn: { index: number; format: string };
  descriptionColumn: { index: number };
  amountColumn: { index: number; inverted: boolean };
  tagColumn?: { index: number };
  creditDebitColumn?: { index: number; creditQuery: string };
};

export type PreviewResult = {
  row: number;
  expense: Expense | null;
  error: string | null;
};

export type SsdiPayPeriod = {
  id: string;
  beginDate: string;
  endDate: string;
  depositExpenseId: string;
  grossEarnings: number;
};

export type SsdiConfig = {
  year: number;
  sgaByYear: Record<number, number>;
};
