import { BrushScrubber } from "@/components/Brush/BrushScrubber";
import { GenericPage } from "@/components/GenericPage/GenericPage";
import {
  useFilteredExpenses,
  useFilteredIncome,
  useFilteredSavings,
} from "@/hooks/expenses";
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
import { GroupedBarChartCard } from "@/components/charts/GroupedBarChartCard";

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
  const [mode, setMode] = useState<Mode>(Mode.MONTHLY);
  const filteredExpenses = useFilteredExpenses();
  const filteredIncome = useFilteredIncome();
  const filteredSavings = useFilteredSavings();

  const sortedGroupedExpenses = useMemo(
    () => getGroupedAndSortedData(mode, filteredExpenses),
    [filteredExpenses, mode]
  );
  const sortedGroupedIncome = useMemo(
    () => getGroupedAndSortedData(mode, filteredIncome),
    [filteredIncome, mode]
  );
  const sortedGroupedSavings = useMemo(
    () => getGroupedAndSortedData(mode, filteredSavings),
    [filteredSavings, mode]
  );

  const groups = useMemo(() => {
    const groupsSet = new Set<string>();
    sortedGroupedExpenses.forEach((e) => groupsSet.add(e.group));
    sortedGroupedIncome.forEach((e) => groupsSet.add(e.group));
    sortedGroupedSavings.forEach((e) => groupsSet.add(e.group));
    return Array.from(groupsSet).sort((a, b) => chartDateCompare(a, b));
  }, [sortedGroupedExpenses, sortedGroupedIncome, sortedGroupedSavings]);

  const barCharts = useMemo(
    () => [
      {
        name: "Expenses",
        y: groups.map((group) => {
          const expenseValue =
            sortedGroupedExpenses.find((e) => e.group === group)?.total ?? 0;
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
          return savingsValue;
        }),
        color: "#ffd000ff",
      },
    ],
    [groups, sortedGroupedExpenses, sortedGroupedIncome, sortedGroupedSavings]
  );

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
      <div style={{ padding: "1.5rem 2rem", height: "100%", display: "flex", flexDirection: "column" }}>
        <GroupedBarChartCard barCharts={barCharts} groups={groups} />
      </div>
    </GenericPage>
  );
}
