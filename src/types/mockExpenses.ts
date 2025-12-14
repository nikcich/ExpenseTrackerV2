import {
  Expense,
  ExpenseTag,
  NonExpenseTags,
  StoreExpenseMap,
  Tag,
} from "./types";

import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";

const ALL_TAGS: Tag[] = [
  ...(Object.values(NonExpenseTags) as Tag[]),
  ...(Object.values(ExpenseTag) as Tag[]),
];

const generateSampleData = (
  startDate: Date,
  endDate: Date,
  totalExpenses: number,
): StoreExpenseMap => {
  const sampleData: StoreExpenseMap = {};

  const oneDay = 24 * 60 * 60 * 1000;

  let currentDate = startDate;
  while (Object.keys(sampleData).length < totalExpenses) {
    const tag: Tag = ALL_TAGS.sort(() => Math.random() - 0.5)[
      Math.floor(Math.random() * ALL_TAGS.length)
    ] as Tag;

    const uuid = uuidv4();

    const expense: Expense = {
      id: uuid,
      amount: Math.floor(Math.random() * 1000),
      tags: [tag],
      date: format(currentDate, "yyyy-MM-dd'T'HH:mm:ss"),
      description: `Expense ${Math.floor(Math.random() * 1000)}`,
    };

    sampleData[expense.id] = expense;

    currentDate = new Date(currentDate.getTime() + oneDay);
    if (currentDate.getTime() > endDate.getTime()) {
      break;
    }
  }

  return sampleData;
};

export const MOCK_EXPENSES: StoreExpenseMap = generateSampleData(
  new Date("2025-01-01"),
  new Date("2026-12-31"),
  300,
);
