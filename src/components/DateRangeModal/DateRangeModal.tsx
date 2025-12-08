import {
  closeAllOverlays,
  Overlay,
  useActiveOverlay,
} from "@/store/OverlayStore";
import { instantBrushRange$ } from "@/store/store";
import { Box, Button, Input, VStack, Text } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { GenericModal } from "../GenericModal/GenericModal";

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
    <GenericModal overlay={Overlay.DateRangeModal}>
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
    </GenericModal>
  );
};
