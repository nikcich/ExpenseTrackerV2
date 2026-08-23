import { GenericPage } from "@/components/GenericPage/GenericPage";
import {
  useFilteredExpenses,
  useFilteredSavings,
} from "@/hooks/expenses";
import {
  byGroup,
  byTag,
  groupAndSumExpenses,
} from "@/utils/expense-utils";
import { useMemo } from "react";
import {
  parseStackedFormat,
} from "@/components/charts/StackedBarChart";
import { BrushScrubber } from "@/components/Brush/BrushScrubber";
import { useDebouncedBrushRange } from "@/store/store";
import { AverageSpendingCard } from "@/components/charts/AverageSpendingCard";
import { Expense } from "@/types/types";

const addTopLevelGroup = (
  data: {
    group: string;
    total: number;
  }[],
  topLevel: string
) => {
  return data.map((item) => ({
    group: `${item.group} > ${topLevel}`,
    total: item.total,
  }));
};

const averageSums = (
  data: {
    group: string;
    total: number;
  }[],
  range: [number, number] | undefined
) => {
  if (!range) return data;

  const startDate = new Date(range[0]);
  const endDate = new Date(range[1]);
  const monthsInRange =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());
  const totalMonths = monthsInRange > 0 ? monthsInRange : 1;

  return data.map((item) => ({
    group: item.group,
    total: item.total / totalMonths,
  }));
};

export function AverageSpending() {
  const filteredExpenses = useFilteredExpenses();
  const filteredSavings = useFilteredSavings();
  const [range] = useDebouncedBrushRange();

  const { traces, groupTraces } = useMemo(() => {
    const build = (keyFn: (e: Expense) => string | string[]) =>
      parseStackedFormat(
        averageSums(
          addTopLevelGroup(
            groupAndSumExpenses([...filteredExpenses, ...filteredSavings], keyFn),
            "Range Average"
          ),
          range
        )
      );
    return { traces: build(byTag), groupTraces: build(byGroup) };
  }, [filteredExpenses, filteredSavings, range]);

  return (
    <GenericPage title="Average Monthly Spending" footer={<BrushScrubber />}>
      <div style={{ padding: "1.5rem 2rem", height: "100%", display: "flex", flexDirection: "column" }}>
        <AverageSpendingCard traces={traces} groupTraces={groupTraces} />
      </div>
    </GenericPage>
  );
}
