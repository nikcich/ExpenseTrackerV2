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
} from "@/components/charts/StackedBarChart";
import { TagStackedBarChartCard } from "@/components/charts/TagStackedBarChartCard";

export function TagStackedBarChart() {
  const [mode, setMode] = useState<Mode>(Mode.MONTHLY);
  const filteredExpenses = useFilteredExpenses();

  const traces = useMemo(() => {
    const grouped = (() => {
      if (mode === Mode.MONTHLY) {
        return groupAndSumExpenses(filteredExpenses, byTag, byMonth);
      } else if (mode === Mode.YEARLY) {
        return groupAndSumExpenses(filteredExpenses, byTag, byYear);
      } else {
        return groupAndSumExpenses(filteredExpenses, byTag, byDay);
      }
    })();
    return parseStackedFormat(grouped);
  }, [filteredExpenses, mode]);

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
        <TagStackedBarChartCard traces={traces} />
      </div>
    </GenericPage>
  );
}
