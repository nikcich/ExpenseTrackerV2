import { Expense, ExpenseTag, NonExpenseTags, Tag } from "./types";

import { v4 as uuidv4 } from "uuid";

const ALL_TAGS: Tag[] = [
  ...(Object.values(NonExpenseTags) as Tag[]),
  ...(Object.values(ExpenseTag) as Tag[]),
];

const generateSampleData = (
  startDate: Date,
  endDate: Date,
  totalExpenses: number
): Expense[] => {
  const sampleData: Expense[] = [];
  const oneDay = 24 * 60 * 60 * 1000;

  let currentDate = startDate;
  while (sampleData.length < totalExpenses) {
    const tag: Tag = ALL_TAGS.sort(() => Math.random() - 0.5)[
      Math.floor(Math.random() * ALL_TAGS.length)
    ] as Tag;

    const expense: Expense = {
      id: uuidv4(),
      amount: Math.floor(Math.random() * 1000),
      tags: [tag],
      date: new Date(currentDate.getTime()).toLocaleDateString("en-US"),
      description: `Expense ${Math.floor(Math.random() * 1000)}`,
      source: `Source ${Math.floor(Math.random() * 1000)}`,
    };
    sampleData.push(expense);

    currentDate = new Date(currentDate.getTime() + oneDay);
    if (currentDate.getTime() > endDate.getTime()) {
      break;
    }
  }

  return sampleData;
};

export const MOCK_EXPENSES: Expense[] = generateSampleData(
  new Date("2025-01-01"),
  new Date("2025-12-31"),
  300
);
