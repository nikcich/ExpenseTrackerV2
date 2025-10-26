import { useDebouncedBrushRange } from "@/store/store";
import { MOCK_EXPENSES } from "@/types/mockExpenses";
import { useMemo } from "react";

export const useFilteredExpenses = () => {
  const [range] = useDebouncedBrushRange();

  const filtered = useMemo(() => {
    if (!range) return MOCK_EXPENSES;
    return MOCK_EXPENSES.filter((expense) => {
      const expenseDate = new Date(expense.date).getTime();
      return expenseDate >= range[0] && expenseDate <= range[1];
    });
  }, [range, MOCK_EXPENSES]);

  return filtered;
};

export const useExpenses = () => {
  return MOCK_EXPENSES;
};
