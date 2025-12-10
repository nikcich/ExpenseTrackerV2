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

const groupAndSum = (data: Expense[]) => {
  const monthlyTotals: { [key: string]: number } = {};
  const groupedData: { group: string; total: number }[] = [];
  const sortedData = data
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const currentYear = new Date().getFullYear();
  for (let i = 1; i <= 12; i++) {
    const monthKey = `${currentYear}-${i}`;
    monthlyTotals[monthKey] = 0;
  }

  for (const expense of sortedData) {
    const date = new Date(expense.date);
    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
    monthlyTotals[monthKey] += expense.amount;
  }

  let runningTotal = 0;
  for (let i = 1; i <= 12; i++) {
    const currentMonthKey = `${currentYear}-${i}`;
    runningTotal += monthlyTotals[currentMonthKey];

    groupedData.push({
      group: currentMonthKey,
      total: runningTotal,
    });
  }

  return groupedData;
};

export function YearToDateChart() {
  const rawExpenses = useExpenses();
  const rawIncome = useIncome();
  const rawSavings = useSavings();

  const filteredExpenses = useMemo(() => {
    return filterYearToDate(rawExpenses);
  }, [rawExpenses]);

  const filteredIncome = useMemo(() => {
    return filterYearToDate(rawIncome);
  }, [rawIncome]);

  const filteredSavings = useMemo(() => {
    return filterYearToDate(rawSavings);
  }, [rawSavings]);

  const sortedGroupedExpenses = useMemo(() => {
    return groupAndSum(filteredExpenses);
  }, [filteredExpenses]);

  const sortedGroupedIncome = useMemo(() => {
    return groupAndSum(filteredIncome);
  }, [filteredIncome]);

  const sortedGroupedSavings = useMemo(() => {
    return groupAndSum(filteredSavings);
  }, [filteredSavings]);

  const groups = useMemo(() => {
    const groupsSet = new Set<string>();
    sortedGroupedExpenses.forEach((e) => groupsSet.add(e.group));
    sortedGroupedIncome.forEach((e) => groupsSet.add(e.group));
    sortedGroupedSavings.forEach((e) => groupsSet.add(e.group));
    return Array.from(groupsSet).sort((a, b) => chartDateCompare(a, b));
  }, [sortedGroupedExpenses, sortedGroupedIncome, sortedGroupedSavings]);

  return (
    <GenericPage title="Year To Date" hasRange={false}>
      <LineChart
        x={groups}
        barCharts={[
          {
            name: "Expenses",
            y: groups.map((group) => {
              const expenseValue =
                sortedGroupedExpenses.find((e) => e.group === group)?.total ??
                0;
              return Math.abs(expenseValue);
            }),
            color: "#bb0000ff",
          },
          {
            name: "Income",
            y: groups.map((group) => {
              const incomeValue =
                sortedGroupedIncome.find((e) => e.group === group)?.total ?? 0;
              return Math.abs(incomeValue);
            }),
            color: "#00a100ff",
          },
          {
            name: "Savings",
            y: groups.map((group) => {
              const savingsValue =
                sortedGroupedSavings.find((e) => e.group === group)?.total ?? 0;
              return Math.abs(savingsValue);
            }),
            color: "#ffd000ff",
          },
        ]}
      />
    </GenericPage>
  );
}
