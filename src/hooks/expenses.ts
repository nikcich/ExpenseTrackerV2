import { useSettingsStore } from "@/store/SettingsStore";
import { useDebouncedBrushRange, useExpensesStore } from "@/store/store";
import { Expense } from "@/types/types";
import { parseDate } from "@/utils/utils";
import { getExpenseKind } from "@/utils/expense-utils";
import { useMemo } from "react";
import * as d3 from "d3";

export const useExpenses = () => {
  const { value } = useExpensesStore();

  const expenses = useMemo(
    () => value?.filter((e) => getExpenseKind(e) === "expense") ?? [],
    [value]
  );
  return expenses;
};

export const useFilteredExpenses = () => {
  const [range] = useDebouncedBrushRange();
  const expenses = useExpenses();
  const disabledTags = useSettingsStore("disabledTags");
  const disabledGroups = useSettingsStore("disabledGroups");

  const filtered = useMemo(() => {
    if (!range) return expenses;
    return expenses
      .filter((expense) => {
        const expenseDate = parseDate(expense.date).getTime();
        return expenseDate >= range[0] && expenseDate <= range[1];
      })
      .filter(
        (expense) =>
          (!disabledTags.some((tag) => expense.tags.includes(tag)) ||
            expense.tags.length === 0) &&
          (!expense.group || !disabledGroups.includes(expense.group))
      );
  }, [range, expenses, disabledTags, disabledGroups]);

  return filtered;
};

export const useIncome = () => {
  const { value } = useExpensesStore();

  const expenses = useMemo(
    () => value?.filter((e) => getExpenseKind(e) === "income") ?? [],
    [value]
  );
  return expenses;
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

export const useSavings = () => {
  const { value } = useExpensesStore();

  const savings = useMemo(() => {
    return value?.filter((e) => getExpenseKind(e) === "savings") ?? [];
  }, [value]);
  return savings;
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

export const useGetExpenseById = (): ((id: string) => Expense | undefined) => {
  const { value } = useExpensesStore();
  return (id: string) => value?.find((e) => e.id === id);
};

export const useDateExtents = () => {
  const expenses = useExpenses();
  const income = useIncome();
  const savings = useSavings();

  const extent = useMemo(() => {
    const expDates = expenses.map((e) => new Date(e.date));
    const incomeDates = income.map((e) => new Date(e.date));
    const savingsDates = savings.map((s) => new Date(s.date));
    const allDates = [
      ...expDates,
      ...incomeDates,
      ...savingsDates,
    ];

    const rawExtent = d3.extent(allDates) as [Date, Date];
    const snappedExtent: [Date, Date] = [
      d3.timeMonth.floor(rawExtent[0]),
      d3.timeMonth.ceil(rawExtent[1]),
    ];
    return snappedExtent;
  }, [expenses, income, savings]);

  return extent;
};
