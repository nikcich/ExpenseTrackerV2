import { BrushScrubber } from "@/components/Brush/BrushScrubber";
import { BarChart } from "../../components/charts/BarChart";
import { GenericPage } from "@/components/GenericPage/GenericPage";
import { useFilteredExpenses, useFilteredIncome } from "@/hooks/expenses";
import {
  byDay,
  byMonth,
  byYear,
  groupAndSumExpenses,
} from "@/utils/expense-utils";
import { useMemo, useState } from "react";
import { Expense, Mode } from "@/types/types";
import { chartDateCompare } from "@/utils/utils";

const getGroupedData = (mode: Mode, data: Expense[]) => {
  if (mode === Mode.MONTHLY) {
    return groupAndSumExpenses(data, byMonth);
  } else if (mode === Mode.YEARLY) {
    return groupAndSumExpenses(data, byYear);
  } else {
    return groupAndSumExpenses(data, byDay);
  }
};

const getGroupedAndSortedData = (mode: Mode, data: Expense[]) => {
  const groupedData = getGroupedData(mode, data);
  return groupedData.sort((a, b) => chartDateCompare(a.group, b.group));
};

export function RangeIncomeExpenseChart() {
  const filteredExpenses = useFilteredExpenses();
  const filteredIncome = useFilteredIncome();

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((acc, expense) => acc + expense.amount, 0);
  }, [filteredExpenses]);

  const totalIncome = useMemo(() => {
    return filteredIncome.reduce((acc, income) => acc + income.amount, 0);
  }, [filteredIncome]);

  return (
    <GenericPage title="Income vs Expenses" footer={<BrushScrubber />}>
      <BarChart
        horizontal={true}
        x={[""]}
        barCharts={[
          {
            name: "Expenses",
            y: [Math.abs(totalExpenses)],
            color: "#bb0000ff",
          },
          {
            name: "Income",
            y: [Math.abs(totalIncome)],
            color: "#00a100ff",
          },
        ]}
      />
    </GenericPage>
  );
}
