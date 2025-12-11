import { useSettingsStore } from "@/store/SettingsStore";
import { useDebouncedBrushRange, useExpensesStore } from "@/store/store";
import { ALL_EXPENSE_TAGS, Expense, NonExpenseTags } from "@/types/types";
import { parseDate } from "@/utils/utils";
import { useMemo } from "react";

export const useFilteredExpenses = () => {
  const [range] = useDebouncedBrushRange();
  const expenses = useExpenses();
  const enabledTags = useSettingsStore("enabledTags");

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
          expense.tags.length === 0 ||
          expense.tags.some((tag) => !ALL_EXPENSE_TAGS.includes(tag)) // Custom tag
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

export const useFilteredSavings = () => {
  const [range] = useDebouncedBrushRange();
  const savings = useSavings();
  const filtered = useMemo(() => {
    if (!range) return savings;
    return savings.filter((saving) => {
      const expenseDate = parseDate(saving.date).getTime();
      return expenseDate >= range[0] && expenseDate <= range[1];
    });
  }, [range, savings]);

  return filtered;
};

export const useExpenses = () => {
  const { value } = useExpensesStore();

  const expenses = useMemo(
    () =>
      value?.filter((e) => {
        const isIncome = e.tags.includes(NonExpenseTags.Income);
        const isSavings = e.tags.includes(NonExpenseTags.Savings);
        return !isIncome && !isSavings;
      }) ?? [],
    [value]
  );
  return expenses;
};

export const useSavings = () => {
  const { value } = useExpensesStore();

  const savings = useMemo(
    () =>
      value?.filter((e) => {
        const isSavings = e.tags.includes(NonExpenseTags.Savings);
        return isSavings;
      }) ?? [],
    [value]
  );
  return savings;
};

export const useIncome = () => {
  const { value } = useExpensesStore();

  const expenses = useMemo(
    () => value?.filter((e) => e.tags.includes(NonExpenseTags.Income)) ?? [],
    [value]
  );
  return expenses;
};

export const useGetExpenseById = (): ((id: string) => Expense | undefined) => {
  const { value } = useExpensesStore();
  return (id: string) => value?.find((e) => e.id === id);
};
