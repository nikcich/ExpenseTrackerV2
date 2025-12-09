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
import { SegmentGroup } from "@chakra-ui/react";
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

export function GroupedBarChart() {
  const filteredExpenses = useFilteredExpenses();
  const filteredIncome = useFilteredIncome();

  const [mode, setMode] = useState<Mode>(Mode.MONTHLY);

  const sortedGroupedExpenses = useMemo(() => {
    return getGroupedAndSortedData(mode, filteredExpenses);
  }, [filteredExpenses, mode]);

  const sortedGroupedIncome = useMemo(() => {
    return getGroupedAndSortedData(mode, filteredIncome);
  }, [filteredIncome, mode]);

  const groups = useMemo(() => {
    const groupsSet = new Set<string>();
    sortedGroupedExpenses.forEach((e) => groupsSet.add(e.group));
    sortedGroupedIncome.forEach((e) => groupsSet.add(e.group));
    return Array.from(groupsSet).sort((a, b) => chartDateCompare(a, b));
  }, [sortedGroupedExpenses, sortedGroupedIncome]);

  return (
    <GenericPage
      title="Date Grouped Expenses"
      footer={<BrushScrubber />}
      actions={
        <>
          <SegmentGroup.Root
            value={mode}
            onValueChange={(e) => setMode(e.value as Mode)}
          >
            <SegmentGroup.Indicator />
            <SegmentGroup.Items items={Object.values(Mode)} />
          </SegmentGroup.Root>
        </>
      }
    >
      <BarChart
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
        ]}
      />
    </GenericPage>
  );
}
