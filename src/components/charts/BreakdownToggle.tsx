import { SegmentGroup } from "@chakra-ui/react";

export type Breakdown = "TAGS" | "GROUPS";

export function BreakdownToggle({
  value,
  onChange,
}: {
  value: Breakdown;
  onChange: (breakdown: Breakdown) => void;
}) {
  return (
    <SegmentGroup.Root
      size="xs"
      value={value}
      onValueChange={(e) => onChange(e.value as Breakdown)}
    >
      <SegmentGroup.Indicator />
      <SegmentGroup.Items items={["TAGS", "GROUPS"]} />
    </SegmentGroup.Root>
  );
}
