import { GenericPage } from "@/components/GenericPage/GenericPage";
import { useExpenses, useIncome, useSavings } from "@/hooks/expenses";
import { useMemo } from "react";
import { Expense } from "@/types/types";
import { LineChart } from "@/components/charts/LineChart";
import { chartDateCompare } from "@/utils/utils";

const filterYear = (data: Expense[], beforeNow: number = 0) => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear() - beforeNow, 0, 1);
  const endOfYear = new Date(startOfYear.getFullYear() + 1, 0, 1);

  return data.filter((e) => {
    const d = new Date(e.date);
    return d < endOfYear && d >= startOfYear;
  });
};

const filterAllExpensesYear = (
  income: Expense[],
  expenses: Expense[],
  savings: Expense[],
  beforeNow: number = 0
): [Expense[], Expense[], Expense[]] => {
  const filteredIncome = filterYear(income, beforeNow);
  const filteredExpenses = filterYear(expenses, beforeNow);
  const filteredSavings = filterYear(savings, beforeNow);

  return [filteredIncome, filteredExpenses, filteredSavings];
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

function withTransparency(hexColor: string, num: number) {
  const step = 255 / 3;

  const alpha = Math.max(0, 255 - num * step);
  const alphaHex = alpha.toString(16).padStart(2, "0");

  return hexColor.slice(0, 7) + alphaHex;
}

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

const YEARS = [0, 1];

export const YearToDateChartCore = ({
  legend = true,
  legendDirection = "v",
}: {
  legend?: boolean;
  legendDirection?: "v" | "h";
}) => {
  const rawExpenses = useExpenses();
  const rawIncome = useIncome();
  const rawSavings = useSavings();

  const { charts, groups } = useMemo(() => {
    const groups = YEARS.map((year) => {
      const currentYearFiltered = filterAllExpensesYear(
        rawIncome,
        rawExpenses,
        rawSavings,
        year
      );

      const currYearGrouped = currentYearFiltered.map((curr) =>
        groupAndSum(curr)
      );
      return currYearGrouped;
    });

    const groupsSet = new Set(groups.flat(2).map((item) => item.group));
    const finalGroups = Array.from(groupsSet).sort((a, b) =>
      chartDateCompare(a, b)
    );

    const charts = YEARS.map((year, index) => {
      const [yearIncome, yearExpenses, yearSavings] = groups[index];
      const thisYear = new Date(
        new Date().getFullYear() - year,
        0,
        1
      ).getFullYear();

      return [
        createChart(
          `${thisYear} Income`,
          withTransparency("#00a100ff", year),
          yearIncome,
          finalGroups
        ),
        createChart(
          `${thisYear} Expenses`,
          withTransparency("#bb0000ff", year),
          yearExpenses,
          finalGroups
        ),
        createChart(
          `${thisYear} Savings`,
          withTransparency("#ffd000ff", year),
          yearSavings,
          finalGroups
        ),
      ];
    }).flat();

    return {
      charts,
      groups: finalGroups,
    };
  }, [rawExpenses, rawIncome, rawSavings]);

  return (
    <LineChart
      legend={legend}
      legendDirection={legendDirection}
      x={groups}
      barCharts={charts}
    />
  );
};

export function YearToDateChart() {
  return (
    <GenericPage title="Year To Date" hasRange={false}>
      <YearToDateChartCore />
    </GenericPage>
  );
}
