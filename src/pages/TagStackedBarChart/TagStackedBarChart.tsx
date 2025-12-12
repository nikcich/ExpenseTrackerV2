import { BrushScrubber } from "@/components/Brush/BrushScrubber";
import { GenericPage } from "@/components/GenericPage/GenericPage";
import { useFilteredExpenses } from "@/hooks/expenses";
import {
  byDay,
  byMonth,
  byTag,
  byYear,
  groupAndSumExpenses,
} from "@/utils/expense-utils";
import { useMemo, useState } from "react";
import { SegmentGroup } from "@chakra-ui/react";
import { Mode } from "@/types/types";
import {
  parseStackedFormat,
  StackedBarChart,
} from "@/components/charts/StackedBarChart";

export const TagStackedBarChartCore = ({
  mode,
  legend = true,
  legendDirection = "v",
}: {
  mode: Mode;
  legend?: boolean;
  legendDirection?: "v" | "h";
}) => {
  const filteredExpenses = useFilteredExpenses();

  const groupedExpenses = useMemo(() => {
    if (mode === Mode.MONTHLY) {
      return groupAndSumExpenses(filteredExpenses, byTag, byMonth);
    } else if (mode === Mode.YEARLY) {
      return groupAndSumExpenses(filteredExpenses, byTag, byYear);
    } else {
      return groupAndSumExpenses(filteredExpenses, byTag, byDay);
    }
  }, [filteredExpenses, mode]);

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

export function TagStackedBarChart() {
  const [mode, setMode] = useState<Mode>(Mode.MONTHLY);

  return (
    <GenericPage
      title="Expenses by Tag"
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
      <TagStackedBarChartCore mode={mode} />
    </GenericPage>
  );
}
