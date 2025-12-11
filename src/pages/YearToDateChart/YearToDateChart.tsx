import { GenericPage } from "@/components/GenericPage/GenericPage";
import { useExpenses, useIncome, useSavings } from "@/hooks/expenses";
import { useMemo } from "react";
import { Expense } from "@/types/types";
import { LineChart } from "@/components/charts/LineChart";
import { chartDateCompare } from "@/utils/utils";

const filterYearToDate = (data: Expense[]) => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  return data.filter((e) => new Date(e.date) >= startOfYear);
};

const filterPreviousYear = (data: Expense[]) => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfPreviousYear = new Date(now.getFullYear() - 1, 0, 1);

  return data.filter((e) => {
    const d = new Date(e.date);
    return d < startOfYear && d >= startOfPreviousYear;
  });
};

const getMonthKey = (i: number) => {
  return new Date(2025, i - 1, 1).toLocaleString("default", { month: "short" });
};

const groupAndSum = (data: Expense[]) => {
  const monthlyTotals: { [key: string]: number } = {};
  const groupedData: { group: string; total: number }[] = [];
  const sortedData = data
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (let i = 1; i <= 12; i++) {
    // const monthKey = `${i}`;
    const monthKey = getMonthKey(i);
    monthlyTotals[monthKey] = 0;
  }

  for (const expense of sortedData) {
    const date = new Date(expense.date);
    const monthKey = getMonthKey(date.getMonth() + 1);
    monthlyTotals[monthKey] += expense.amount;
  }

  let runningTotal = 0;
  for (let i = 1; i <= 12; i++) {
    const currentMonthKey = getMonthKey(i);

    runningTotal += monthlyTotals[currentMonthKey];

    groupedData.push({
      group: currentMonthKey,
      total: runningTotal,
    });
  }

  return groupedData;
};

const LAST_YEAR = new Date(new Date().getFullYear() - 1, 0, 1).getFullYear();
const THIS_YEAR = new Date().getFullYear();
const createChart = (
  name: string,
  color: string,
  sortedGroupedExpenses: any[],
  groups: string[]
) => {
  return {
    name,
    y: groups.map((group) => {
      const expenseValue =
        sortedGroupedExpenses.find((e) => e.group === group)?.total ?? 0;
      return Math.abs(expenseValue);
    }),
    color,
  };
};

export function YearToDateChart() {
  const rawExpenses = useExpenses();
  const rawIncome = useIncome();
  const rawSavings = useSavings();

  const {
    sortedGroupedExpenses,
    sortedGroupedIncome,
    sortedGroupedSavings,
    lastYearSortedGroupedExpenses,
    lastYearSortedGroupedIncome,
    lastYearSortedGroupedSavings,
    groups,
  } = useMemo(() => {
    const filteredExpenses = filterYearToDate(rawExpenses);
    const filteredIncome = filterYearToDate(rawIncome);
    const filteredSavings = filterYearToDate(rawSavings);

    const filteredLastYearExpenses = filterPreviousYear(rawExpenses);
    const filteredLastYearIncome = filterPreviousYear(rawIncome);
    const filteredLastYearSavings = filterPreviousYear(rawSavings);

    const sortedGroupedExpenses = groupAndSum(filteredExpenses);
    const sortedGroupedIncome = groupAndSum(filteredIncome);
    const sortedGroupedSavings = groupAndSum(filteredSavings);

    const lastYearSortedGroupedExpenses = groupAndSum(filteredLastYearExpenses);
    const lastYearSortedGroupedIncome = groupAndSum(filteredLastYearIncome);
    const lastYearSortedGroupedSavings = groupAndSum(filteredLastYearSavings);

    const groupsSet = new Set([
      ...sortedGroupedExpenses.map((e) => e.group),
      ...sortedGroupedIncome.map((e) => e.group),
      ...sortedGroupedSavings.map((e) => e.group),
      ...lastYearSortedGroupedExpenses.map((e) => e.group),
      ...lastYearSortedGroupedIncome.map((e) => e.group),
      ...lastYearSortedGroupedSavings.map((e) => e.group),
    ]);

    return {
      sortedGroupedExpenses,
      sortedGroupedIncome,
      sortedGroupedSavings,
      lastYearSortedGroupedExpenses,
      lastYearSortedGroupedIncome,
      lastYearSortedGroupedSavings,
      groups: Array.from(groupsSet).sort((a, b) => chartDateCompare(a, b)),
    };
  }, [rawExpenses, rawIncome, rawSavings]);

  return (
    <GenericPage title="Year To Date" hasRange={false}>
      <LineChart
        x={groups}
        barCharts={[
          createChart(
            `${THIS_YEAR} Expenses`,
            "#bb0000ff",
            sortedGroupedExpenses,
            groups
          ),
          createChart(
            `${THIS_YEAR} Income`,
            "#00a100ff",
            sortedGroupedIncome,
            groups
          ),
          createChart(
            `${THIS_YEAR} Savings`,
            "#ffd000ff",
            sortedGroupedSavings,
            groups
          ),
          createChart(
            `${LAST_YEAR} Expenses`,
            "#bb000079",
            lastYearSortedGroupedExpenses,
            groups
          ),
          createChart(
            `${LAST_YEAR} Income`,
            "#00a10071",
            lastYearSortedGroupedIncome,
            groups
          ),
          createChart(
            `${LAST_YEAR} Savings`,
            "#ffd00067",
            lastYearSortedGroupedSavings,
            groups
          ),
        ]}
      />
    </GenericPage>
  );
}
