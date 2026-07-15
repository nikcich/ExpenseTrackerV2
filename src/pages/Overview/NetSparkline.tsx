import { useMemo } from "react";
import { Sparkline } from "@/components/Sparkline/Sparkline";
import { formatMonthShort } from "@/utils/utils";

export function NetSparkline({
  data,
  months,
  selectedIndex,
  formatLabel,
}: {
  data: number[];
  months: Date[];
  selectedIndex: number;
  formatLabel?: (date: Date) => string;
}) {
  const fmt = formatLabel ?? formatMonthShort;

  const points = useMemo(
    () => data.map((v, i) => ({ label: fmt(months[i]), value: v })),
    [data, months, fmt],
  );

  return (
    <Sparkline
      data={points}
      segmentColors={{
        positive: "var(--fg-success, #4ade80)",
        negative: "var(--fg-error, #f87171)",
      }}
      height={60}
      padding={{ top: 2, right: 15, bottom: 14, left: 15 }}
      showArea
      showDots
      selectedIndex={selectedIndex}
      showLabels="auto"
      emptyText="No data"
    />
  );
}
