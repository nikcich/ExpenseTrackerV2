import {
  BalanceSnapshotsMap,
  ExpenseTag,
  ForecastConfigData,
  GrantMap,
  ImportHistory,
  KnownStoreKeys,
  NonExpenseTags,
  RsuVestsMap,
  SalesMap,
  SsdiConfig,
  StockMap,
  StoreExpenseMap,
  Tag,
} from "./types";

import { v4 as uuidv4 } from "uuid";
import { format, subMonths, addMonths } from "date-fns";

const now = new Date();
const startDate = subMonths(now, 12);
const endDate = now;

const descriptions: Partial<Record<string, string[]>> = {
  [ExpenseTag.Food]: [
    "Groceries",
    "Restaurant",
    "Coffee Shop",
    "Lunch",
    "Dinner",
  ],
  [ExpenseTag.Entertainment]: [
    "Movie Tickets",
    "Streaming",
    "Concert",
    "Games",
  ],
  [ExpenseTag.Shopping]: ["Amazon", "Clothing", "Home Goods", "Electronics"],
  [ExpenseTag.Transportation]: ["Uber", "Bus Pass", "Parking"],
  [ExpenseTag.Health_Med]: ["Pharmacy", "Doctor Copay", "Dental"],
  [ExpenseTag.Gifts]: ["Birthday Gift", "Holiday Gift", "Wedding Gift"],
  [ExpenseTag.Misc]: ["Haircut", "Laundry", "Subscriptions", "Fees"],
};

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const descFor = (tag: string): string =>
  pick((descriptions as Record<string, string[]>)[tag] ?? [tag]);

const roundAmt = (n: number) => Math.round(n * 100) / 100;

const addExpense = (
  map: StoreExpenseMap,
  date: Date,
  amount: number,
  tags: Tag[],
  description: string,
) => {
  const id = uuidv4();
  map[id] = {
    id,
    amount: roundAmt(amount),
    tags,
    date: format(date, "yyyy-MM-dd'T'HH:mm:ss"),
    description,
  };
};

const generateRealisticExpenses = (from: Date, to: Date): StoreExpenseMap => {
  const map: StoreExpenseMap = {};
  let current = new Date(from.getFullYear(), from.getMonth(), 1);

  while (current <= to) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Semimonthly salary (15th + last day) — ~$4,600/month after tax on $80k/yr
    addExpense(
      map,
      new Date(year, month, 15),
      2300,
      [NonExpenseTags.Income],
      "Salary",
    );
    addExpense(
      map,
      new Date(year, month, daysInMonth),
      2300,
      [NonExpenseTags.Income],
      "Salary",
    );

    // Rent — 1st
    addExpense(
      map,
      new Date(year, month, 1),
      2000,
      [ExpenseTag.Rent_Mortgage],
      "Rent",
    );

    // Utilities — 5th
    addExpense(
      map,
      new Date(year, month, 5),
      300,
      [ExpenseTag.Utilities],
      "Electric & Internet",
    );

    // Insurance — 1st
    addExpense(
      map,
      new Date(year, month, 1),
      150,
      [ExpenseTag.Insurance],
      "Health Insurance",
    );

    // Car loan — 15th
    addExpense(
      map,
      new Date(year, month, 15),
      400,
      [ExpenseTag.Debt],
      "Car Loan Payment",
    );

    // Student loan — 10th
    addExpense(
      map,
      new Date(year, month, 10),
      300,
      [ExpenseTag.Debt],
      "Student Loan Payment",
    );

    // Food — ~$500/month spread across 6-8 transactions
    let foodTotal = 0;
    while (foodTotal < 500) {
      const day = 1 + Math.floor(Math.random() * daysInMonth);
      const amt = Math.min(500 - foodTotal, 15 + Math.random() * 55);
      if (amt < 5) break;
      addExpense(
        map,
        new Date(year, month, day),
        amt,
        [ExpenseTag.Food],
        descFor(ExpenseTag.Food),
      );
      foodTotal += amt;
    }

    // Gas — 2x per month
    addExpense(
      map,
      new Date(year, month, 8 + Math.floor(Math.random() * 5)),
      35 + Math.random() * 15,
      [ExpenseTag.Gas],
      "Gas",
    );
    addExpense(
      map,
      new Date(year, month, 20 + Math.floor(Math.random() * 7)),
      35 + Math.random() * 15,
      [ExpenseTag.Gas],
      "Gas",
    );

    // Entertainment — 1-2x per month
    const entCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < entCount; i++) {
      const day = 1 + Math.floor(Math.random() * daysInMonth);
      addExpense(
        map,
        new Date(year, month, day),
        15 + Math.random() * 50,
        [ExpenseTag.Entertainment],
        descFor(ExpenseTag.Entertainment),
      );
    }

    // Shopping — once per month
    addExpense(
      map,
      new Date(year, month, 1 + Math.floor(Math.random() * daysInMonth)),
      50 + Math.random() * 150,
      [ExpenseTag.Shopping],
      descFor(ExpenseTag.Shopping),
    );

    // Misc / Health / Transport / Gifts — 2-3 smaller items
    const miscCount = 2 + Math.floor(Math.random() * 2);
    const miscPools = [
      ExpenseTag.Misc,
      ExpenseTag.Health_Med,
      ExpenseTag.Gifts,
      ExpenseTag.Transportation,
    ];
    for (let i = 0; i < miscCount; i++) {
      const day = 1 + Math.floor(Math.random() * daysInMonth);
      const tag = pick(miscPools);
      addExpense(
        map,
        new Date(year, month, day),
        10 + Math.random() * 80,
        [tag],
        descFor(tag),
      );
    }

    // Savings transfer — last day
    addExpense(
      map,
      new Date(year, month, daysInMonth),
      600,
      [NonExpenseTags.Savings],
      "Monthly Savings",
    );

    current = new Date(year, month + 1, 1);
  }

  return map;
};

export const MOCK_EXPENSES: StoreExpenseMap = generateRealisticExpenses(
  startDate,
  endDate,
);

const generateMockStocks = (): StockMap => {
  const id = uuidv4();
  return {
    [id]: { id, ticker: "AAPL", currentPrice: 175 },
  };
};

export const MOCK_STOCKS: StockMap = generateMockStocks();

const generateMockGrants = (stockId: string): GrantMap => {
  const map: GrantMap = {};
  const grantId = uuidv4();
  map[grantId] = {
    id: grantId,
    name: "Q1 2024 RSU Grant",
    stockId,
    grantPrice: 150,
    totalShares: 200,
  };
  return map;
};

const firstStockId = Object.keys(MOCK_STOCKS)[0];
export const MOCK_GRANTS: GrantMap = generateMockGrants(firstStockId);

const generateMockRsuVests = (from: Date, grants: GrantMap): RsuVestsMap => {
  const map: RsuVestsMap = {};
  const grantId = Object.keys(grants)[0];
  if (!grantId) return map;
  for (let i = 0; i < 4; i++) {
    const id = uuidv4();
    const vestDate = addMonths(from, i * 3 + 1);
    map[id] = {
      id,
      grantId,
      vestDate: format(vestDate, "yyyy-MM-dd"),
      shares: 50,
      basisPrice: Math.round((45 + Math.random() * 15) * 10) / 10,
    };
  }
  return map;
};

export const MOCK_RSU_VESTS: RsuVestsMap = generateMockRsuVests(startDate, MOCK_GRANTS);

const generateMockSales = (from: Date, stockId: string): SalesMap => {
  const map: SalesMap = {};
  const sale1Id = uuidv4();
  const saleDate = addMonths(from, 6);
  map[sale1Id] = {
    id: sale1Id,
    stockId,
    date: format(saleDate, "yyyy-MM-dd"),
    shares: 25,
    salePrice: Math.round((180 + Math.random() * 20) * 10) / 10,
    basisPrice: 45,
  };
  const sale2Id = uuidv4();
  const sale2Date = addMonths(from, 9);
  map[sale2Id] = {
    id: sale2Id,
    stockId,
    date: format(sale2Date, "yyyy-MM-dd"),
    shares: 25,
    salePrice: Math.round((185 + Math.random() * 20) * 10) / 10,
    basisPrice: 50,
  };
  return map;
};

export const MOCK_SALES: SalesMap = generateMockSales(startDate, firstStockId);

const generateMockBalanceSnapshots = (
  from: Date,
  to: Date,
): BalanceSnapshotsMap => {
  const map: BalanceSnapshotsMap = {};
  const cursor = new Date(from.getFullYear(), from.getMonth(), 15);
  const monthsCount =
    (to.getFullYear() - from.getFullYear()) * 12 +
    to.getMonth() -
    from.getMonth() +
    1;

  while (cursor <= to) {
    const i =
      (cursor.getFullYear() - from.getFullYear()) * 12 +
      cursor.getMonth() -
      from.getMonth();
    const progress = monthsCount > 1 ? i / (monthsCount - 1) : 0;

    const id1 = uuidv4();
    map[id1] = {
      id: id1,
      accountName: "Checking",
      date: format(cursor, "yyyy-MM-dd"),
      balance:
        Math.round((5000 + progress * 1000 + Math.random() * 500 - 250) * 100) /
        100,
      type: "asset",
    };

    const id2 = uuidv4();
    map[id2] = {
      id: id2,
      accountName: "Savings",
      date: format(cursor, "yyyy-MM-dd"),
      balance:
        Math.round(
          (10000 + progress * 7200 + Math.random() * 1000 - 500) * 100,
        ) / 100,
      type: "asset",
    };

    const id3 = uuidv4();
    map[id3] = {
      id: id3,
      accountName: "Credit Card",
      date: format(cursor, "yyyy-MM-dd"),
      balance: Math.round((2000 + Math.random() * 1000 - 500) * 100) / 100,
      type: "debt",
    };

    const id4 = uuidv4();
    const carLoanStart = 18000;
    const carLoanEnd = 13200;
    map[id4] = {
      id: id4,
      accountName: "Car Loan",
      date: format(cursor, "yyyy-MM-dd"),
      balance:
        Math.round(
          (-carLoanStart +
            progress * (carLoanStart - carLoanEnd) +
            Math.random() * 200 -
            100) *
            100,
        ) / 100,
      type: "debt",
    };

    const id5 = uuidv4();
    const studentLoanStart = 30000;
    const studentLoanEnd = 26400;
    map[id5] = {
      id: id5,
      accountName: "Student Loan",
      date: format(cursor, "yyyy-MM-dd"),
      balance:
        Math.round(
          (-studentLoanStart +
            progress * (studentLoanStart - studentLoanEnd) +
            Math.random() * 200 -
            100) *
            100,
        ) / 100,
      type: "debt",
    };

    cursor.setMonth(cursor.getMonth() + 1);
  }
  return map;
};

export const MOCK_BALANCE_SNAPSHOTS: BalanceSnapshotsMap =
  generateMockBalanceSnapshots(startDate, endDate);

const forecastStartMonth = new Date(
  startDate.getFullYear(),
  startDate.getMonth(),
  1,
);

export const MOCK_FORECAST_CONFIG: ForecastConfigData = {
  startBalance: 10000,
  reserve: 2000,
  startDate: format(forecastStartMonth, "yyyy-MM-dd"),
  endDate: format(endDate, "yyyy-MM-dd"),
  incomeStreams: [
    {
      name: "Salary",
      amount: 2300,
      payPeriod: "semimonthly",
      firstPaycheckDate: format(forecastStartMonth, "yyyy-MM-15"),
      semimonthlyPayday1: 15,
      semimonthlyPayday2: 31,
    },
  ],
  expenses: [
    { name: "Rent", day: 1, amount: 2000, period: "monthly" },
    { name: "Utilities", day: 5, amount: 300, period: "monthly" },
    { name: "Insurance", day: 1, amount: 150, period: "monthly" },
    { name: "Car Loan", day: 15, amount: 400, period: "monthly" },
    { name: "Student Loan", day: 10, amount: 300, period: "monthly" },
    { name: "Groceries", day: 3, amount: 200, period: "biweekly" },
    { name: "Gas", day: 8, amount: 40, period: "biweekly" },
    { name: "Entertainment", day: 12, amount: 60, period: "monthly" },
    { name: "Shopping", day: 18, amount: 100, period: "monthly" },
    { name: "Misc", day: 22, amount: 80, period: "monthly" },
  ],
};

export const MOCK_BRUSH_RANGE: [number, number] = [
  startDate.getTime(),
  endDate.getTime(),
];

const generateMockSsdiPayPeriods = (): Record<string, { id: string; beginDate: string; endDate: string; depositExpenseId: string; grossEarnings: number }> => {
  const map: Record<string, { id: string; beginDate: string; endDate: string; depositExpenseId: string; grossEarnings: number }> = {};
  const expenseIds = Object.keys(MOCK_EXPENSES);
  const salaryIds = expenseIds.filter((id) => MOCK_EXPENSES[id].description === "Salary");
  for (let i = 0; i < Math.min(4, salaryIds.length); i++) {
    const id = uuidv4();
    const salaryExpense = MOCK_EXPENSES[salaryIds[i]];
    const depositDate = new Date(salaryExpense.date);
    const beginDate = new Date(depositDate);
    beginDate.setDate(beginDate.getDate() - 14);
    map[id] = {
      id,
      beginDate: format(beginDate, "yyyy-MM-dd"),
      endDate: format(depositDate, "yyyy-MM-dd"),
      depositExpenseId: salaryIds[i],
      grossEarnings: 2800 + Math.round(Math.random() * 400),
    };
  }
  return map;
};

export const MOCK_SSDI_PAY_PERIODS = generateMockSsdiPayPeriods();

export const MOCK_SSDI_CONFIG: SsdiConfig = {
  year: new Date().getFullYear(),
  sgaByYear: { [new Date().getFullYear()]: 1620 },
};

export const MOCK_IMPORT_HISTORY: ImportHistory = [
  format(subMonths(now, 6), "yyyy-MM-dd"),
  format(subMonths(now, 3), "yyyy-MM-dd"),
  format(subMonths(now, 1), "yyyy-MM-dd"),
];

export const MOCK_DATA_MAP: Partial<Record<KnownStoreKeys, unknown>> = {
  [KnownStoreKeys.Expenses]: MOCK_EXPENSES,
  [KnownStoreKeys.Stocks]: MOCK_STOCKS,
  [KnownStoreKeys.Grants]: MOCK_GRANTS,
  [KnownStoreKeys.RsuVests]: MOCK_RSU_VESTS,
  [KnownStoreKeys.Sales]: MOCK_SALES,
  [KnownStoreKeys.BalanceSnapshots]: MOCK_BALANCE_SNAPSHOTS,
  [KnownStoreKeys.ForecastConfig]: MOCK_FORECAST_CONFIG,
  [KnownStoreKeys.SsdiPayPeriods]: MOCK_SSDI_PAY_PERIODS,
  [KnownStoreKeys.SsdiConfig]: MOCK_SSDI_CONFIG,
  [KnownStoreKeys.ImportHistory]: MOCK_IMPORT_HISTORY,
};
