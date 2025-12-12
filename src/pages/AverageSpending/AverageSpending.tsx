import { GenericPage } from "@/components/GenericPage/GenericPage";
import { useFilteredExpenses, useFilteredSavings } from "@/hooks/expenses";
import { byTag, groupAndSumExpenses } from "@/utils/expense-utils";
import { useMemo } from "react";
import {
  parseStackedFormat,
  StackedBarChart,
} from "@/components/charts/StackedBarChart";
import { BrushScrubber } from "@/components/Brush/BrushScrubber";
import { useDebouncedBrushRange } from "@/store/store";

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

export const AverageSpendingCore = ({
  legend = true,
  legendDirection = "v",
}: {
  legend?: boolean;
  legendDirection?: "v" | "h";
}) => {
  const filteredExpenses = useFilteredExpenses();
  const filteredSavings = useFilteredSavings();
  const [range] = useDebouncedBrushRange();

  const groupedExpenses = useMemo(() => {
    const tagGrouped = groupAndSumExpenses(
      [...filteredExpenses, ...filteredSavings],
      byTag
    );

    const topLevelGrouped = addTopLevelGroup(tagGrouped, "Range Average");
    return averageSums(topLevelGrouped, range);
  }, [filteredExpenses, filteredSavings, range]);

  const traces = useMemo(
    () => parseStackedFormat(groupedExpenses),
    [groupedExpenses]
  );

  return (
    <StackedBarChart
      data={traces}
      legend={legend}
      legendDirection={legendDirection}
    />
  );
};

export function AverageSpending() {
  return (
    <GenericPage title="Average Monthly Spending" footer={<BrushScrubber />}>
      <AverageSpendingCore />
    </GenericPage>
  );
}
