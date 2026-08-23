import { BrushScrubber } from "@/components/Brush/BrushScrubber";
import { GenericPage } from "@/components/GenericPage/GenericPage";
import { useFilteredExpenses } from "@/hooks/expenses";
import {
  byDay,
  byGroup,
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
} from "@/components/charts/StackedBarChart";
import { TagStackedBarChartCard } from "@/components/charts/TagStackedBarChartCard";

export function TagStackedBarChart() {
  const [mode, setMode] = useState<Mode>(Mode.MONTHLY);
  const filteredExpenses = useFilteredExpenses();

  const dateKeyFn =
    mode === Mode.MONTHLY
      ? byMonth
      : mode === Mode.YEARLY
        ? byYear
        : byDay;

  const traces = useMemo(() => {
    return parseStackedFormat(
      groupAndSumExpenses(filteredExpenses, byTag, dateKeyFn)
    );
  }, [filteredExpenses, dateKeyFn]);

  const groupTraces = useMemo(() => {
    return parseStackedFormat(
      groupAndSumExpenses(filteredExpenses, byGroup, dateKeyFn)
    );
  }, [filteredExpenses, dateKeyFn]);

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
      <div style={{ padding: "1.5rem 2rem", height: "100%", display: "flex", flexDirection: "column" }}>
        <TagStackedBarChartCard traces={traces} groupTraces={groupTraces} />
      </div>
    </GenericPage>
  );
}
