import { useSettingsStore } from "@/store/SettingsStore";
import { useDebouncedBrushRange, useExpensesStore } from "@/store/store";
import { NonExpenseTags } from "@/types/types";
import { parseDate } from "@/utils/utils";
import { useMemo } from "react";

export const useFilteredExpenses = () => {
  const [range] = useDebouncedBrushRange();
  const expenses = useExpenses();
  const enabledTags = useSettingsStore("enabledTags");

  console.log(expenses);

  const filtered = useMemo(() => {
    if (!range) return expenses;
    return expenses
      .filter((expense) => {
        const expenseDate = parseDate(expense.date).getTime();
        return expenseDate >= range[0] && expenseDate <= range[1];
      })
      .filter(
        (expense) =>
          enabledTags.some((tag) => expense.tags.includes(tag)) ||
          expense.tags.length === 0
      );
  }, [range, expenses]);

  return filtered;
};

export const useFilteredIncome = () => {
  const [range] = useDebouncedBrushRange();
  const income = useIncome();

  const filtered = useMemo(() => {
    if (!range) return income;
    return income.filter((income) => {
      const expenseDate = parseDate(income.date).getTime();
      return expenseDate >= range[0] && expenseDate <= range[1];
    });
  }, [range, income]);

  return filtered;
};

export const useExpenses = () => {
  const { value } = useExpensesStore();

  const expenses = useMemo(
    () => value?.filter((e) => !e.tags.includes(NonExpenseTags.Income)) ?? [],
    [value]
  );
  return expenses;
};

export const useIncome = () => {
  const { value } = useExpensesStore();

  const expenses = useMemo(
    () => value?.filter((e) => e.tags.includes(NonExpenseTags.Income)) ?? [],
    [value]
  );
  return expenses;
};
