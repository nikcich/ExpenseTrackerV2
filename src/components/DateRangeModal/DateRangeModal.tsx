import {
  closeAllOverlays,
  Overlay,
  useActiveOverlay,
} from "@/store/OverlayStore";
import { instantBrushRange$ } from "@/store/store";
import { Box, Button, Input, VStack, Text } from "@chakra-ui/react";
import { useCallback, useState } from "react";

export const DateRangeModal = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const activeOverlay = useActiveOverlay();

  const isOpen = activeOverlay === Overlay.DateRangeModal;

  const onClose = useCallback(() => {
    closeAllOverlays();
  }, []);

  const onApply = useCallback((start: string, end: string) => {
    const d1 = new Date(start);
    const d2 = new Date(end);

    const ts1 = d1.getTime();
    const ts2 = d2.getTime();

    instantBrushRange$.next([ts1, ts2]);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(10px)",
        zIndex: 100,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Box bg="black" borderRadius="md" p={6} width={"50%"} boxShadow="lg">
        <Text fontSize="lg" mb={4}>
          Select Date Range
        </Text>
        <VStack>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start Date"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="End Date"
          />
        </VStack>

        <Box mt={6} display="flex" justifyContent="flex-end" gap={2}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorPalette={"blue"}
            onClick={() => {
              onApply(startDate, endDate);
              onClose();
            }}
            disabled={!startDate || !endDate}
          >
            Apply
          </Button>
        </Box>
      </Box>
    </div>
  );
};

interface MonthYearSelectorProps {
  initialMonth?: number; // 0 = Jan, 11 = Dec
  initialYear?: number;
  minYear?: number;
  maxYear?: number;
  onApply: (month: number, year: number) => void;
}

export const MonthYearSelector: React.FC<MonthYearSelectorProps> = ({
  initialMonth,
  initialYear,
  minYear = 2000,
  maxYear = new Date().getFullYear(),
  onApply,
}) => {
  const [month, setMonth] = useState(initialMonth ?? new Date().getMonth());
  const [year, setYear] = useState(initialYear ?? new Date().getFullYear());

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => minYear + i
  );

  return (
    <div
      style={{
        display: "inline-block",
        padding: 10,
        border: "1px solid #ccc",
        borderRadius: 5,
      }}
    >
      <div>
        <label>
          Month:
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {months.map((m, idx) => (
              <option key={idx} value={idx}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <label>
          Year:
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginTop: 10 }}>
        <button onClick={() => onApply(month, year)}>Apply</button>
      </div>
    </div>
  );
};
