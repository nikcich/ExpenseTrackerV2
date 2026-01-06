import { useSettingsStore } from "@/store/SettingsStore";
import { useDebouncedBrushRange, useExpensesStore } from "@/store/store";
import { ALL_EXPENSE_TAGS, Expense, NonExpenseTags } from "@/types/types";
import { parseDate } from "@/utils/utils";
import { useMemo } from "react";
import * as d3 from "d3";

export const useExpenses = () => {
  const { value } = useExpensesStore();

  const expenses = useMemo(
    () =>
      value?.filter((e) => {
        const isIncome =
          e.tags.includes(NonExpenseTags.Income) ||
          e.tags.includes(NonExpenseTags.RSU);
        const isSavings =
          e.tags.includes(NonExpenseTags.Savings) ||
          e.tags.includes(NonExpenseTags.RSU);
        const isRetirement = e.tags.includes(NonExpenseTags.Retirement);
        return !isIncome && !isSavings && !isRetirement;
      }) ?? [],
    [value]
  );
  return expenses;
};

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

export const useIncome = (includeRsu: boolean = true) => {
  const { value } = useExpensesStore();
  const enabledTags = useSettingsStore("enabledTags");
  const includeRSU = enabledTags.includes(NonExpenseTags.RSU) && includeRsu;

  const expenses = useMemo(
    () =>
      value?.filter(
        (e) =>
          e.tags.includes(NonExpenseTags.Income) ||
          (e.tags.includes(NonExpenseTags.RSU) && includeRSU)
      ) ?? [],
    [value]
  );
  return expenses;
};

export const useFilteredIncome = (includeRsu: boolean = true) => {
  const [range] = useDebouncedBrushRange();
  const income = useIncome(includeRsu);

  const filtered = useMemo(() => {
    if (!range) return income;
    return income.filter((income) => {
      const expenseDate = parseDate(income.date).getTime();
      return expenseDate >= range[0] && expenseDate <= range[1];
    });
  }, [range, income]);

  return filtered;
};

export const useSavings = (rsu: boolean = true) => {
  const { value } = useExpensesStore();
  const enabledTags = useSettingsStore("enabledTags");
  const includeRSU = enabledTags.includes(NonExpenseTags.RSU) && rsu;

  const savings = useMemo(() => {
    const normalSavings =
      value?.filter((e) => e.tags.includes(NonExpenseTags.Savings)) ?? [];
    const rsuSavings = includeRSU
      ? (value?.filter((e) => e.tags.includes(NonExpenseTags.RSU)) ?? [])
      : [];
    const invertedRSU = rsuSavings.map((e) => ({ ...e, amount: -e.amount })); // RSU amount needs to be inverted
    return [...normalSavings, ...invertedRSU];
  }, [value]);
  return savings;
};

export const useFilteredSavings = (rsu: boolean = true) => {
  const [range] = useDebouncedBrushRange();
  const savings = useSavings(rsu);
  const filtered = useMemo(() => {
    if (!range) return savings;
    return savings.filter((saving) => {
      const expenseDate = parseDate(saving.date).getTime();
      return expenseDate >= range[0] && expenseDate <= range[1];
    });
  }, [range, savings]);

  return filtered;
};

export const useRsu = () => {
  const { value } = useExpensesStore();
  const rsu = useMemo(() => {
    return value?.filter((e) => e.tags.includes(NonExpenseTags.RSU)) ?? [];
  }, [value]);
  return rsu;
};

export const useFilteredRsu = () => {
  const [range] = useDebouncedBrushRange();
  const rsu = useRsu();

  const filtered = useMemo(() => {
    if (!range) return rsu;
    return rsu.filter((rsu) => {
      const expenseDate = parseDate(rsu.date).getTime();
      return expenseDate >= range[0] && expenseDate <= range[1];
    });
  }, [range, rsu]);

  return filtered;
};

export const useRetirement = () => {
  const { value } = useExpensesStore();
  const retirement = useMemo(() => {
    return (
      value?.filter((e) => e.tags.includes(NonExpenseTags.Retirement)) ?? []
    );
  }, [value]);
  return retirement;
};

export const useFilteredRetirement = () => {
  const [range] = useDebouncedBrushRange();
  const retirement = useRetirement();

  const filtered = useMemo(() => {
    if (!range) return retirement;
    return retirement.filter((retirement) => {
      const expenseDate = parseDate(retirement.date).getTime();
      return expenseDate >= range[0] && expenseDate <= range[1];
    });
  }, [range, retirement]);

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
  const retirement = useRetirement();

  const extent = useMemo(() => {
    const expDates = expenses.map((e) => new Date(e.date));
    const incomeDates = income.map((e) => new Date(e.date));
    const savingsDates = savings.map((s) => new Date(s.date));
    const retirementDates = retirement.map((r) => new Date(r.date));
    const allDates = [
      ...expDates,
      ...incomeDates,
      ...savingsDates,
      ...retirementDates,
    ];

    const rawExtent = d3.extent(allDates) as [Date, Date];
    const snappedExtent: [Date, Date] = [
      d3.timeMonth.floor(rawExtent[0]),
      d3.timeMonth.ceil(rawExtent[1]),
    ];
    return snappedExtent;
  }, [expenses, income, savings, retirement]);

  return extent;
};
