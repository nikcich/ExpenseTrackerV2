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

export function TagStackedBarChart() {
  const filteredExpenses = useFilteredExpenses();
  const [mode, setMode] = useState<Mode>(Mode.MONTHLY);

  const groupedExpenses = useMemo(() => {
    if (mode === Mode.MONTHLY) {
      return groupAndSumExpenses(filteredExpenses, byTag, byMonth);
    } else if (mode === Mode.YEARLY) {
      return groupAndSumExpenses(filteredExpenses, byTag, byYear);
    } else {
      return groupAndSumExpenses(filteredExpenses, byTag, byDay);
    }
  }, [filteredExpenses, mode]);

  console.log(groupedExpenses);

  const traces = useMemo(
    () => parseStackedFormat(groupedExpenses),
    [groupedExpenses]
  );

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
      <StackedBarChart data={traces} />
    </GenericPage>
  );
}
