import { BrushScrubber } from "@/components/Brush/BrushScrubber";
import { BarChart } from "../../components/charts/BarChart";
import { MOCK_EXPENSES } from "@/types/mockExpenses";
import { GenericPage } from "@/components/GenericPage/GenericPage";
import { useFilteredExpenses } from "@/hooks/expenses";
import {
  byDay,
  byMonth,
  byYear,
  groupAndSumExpenses,
} from "@/utils/expense-utils";
import { useMemo, useState } from "react";
import { SegmentGroup } from "@chakra-ui/react";
import { Mode } from "@/types/types";

export function GroupedBarChart() {
  const filteredExpenses = useFilteredExpenses();
  const [mode, setMode] = useState<Mode>(Mode.MONTHLY);

  const groupedExpenses = useMemo(() => {
    if (mode === Mode.MONTHLY) {
      return groupAndSumExpenses(filteredExpenses, byMonth);
    } else if (mode === Mode.YEARLY) {
      return groupAndSumExpenses(filteredExpenses, byYear);
    } else {
      return groupAndSumExpenses(filteredExpenses, byDay);
    }
  }, [filteredExpenses, mode]);

  return (
    <GenericPage
      title="Date Grouped Expenses"
      footer={<BrushScrubber expenses={MOCK_EXPENSES} />}
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
        x={groupedExpenses.map((e) => e.group)}
        y={groupedExpenses.map((e) => e.total)}
      />
    </GenericPage>
  );
}
