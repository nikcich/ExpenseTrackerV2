import { BrushScrubber } from "@/components/Brush/BrushScrubber";
import { BarChart } from "../../components/charts/BarChart";
import { MOCK_EXPENSES } from "@/types/mockExpenses";
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

export function Test() {
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

  return (
    <GenericPage
      title="Test Page"
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
      <h1>Nice</h1>
    </GenericPage>
  );
}
