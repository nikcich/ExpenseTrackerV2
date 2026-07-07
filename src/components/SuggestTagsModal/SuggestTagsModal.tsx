import { closeAllOverlays, Overlay } from "@/store/OverlayStore";
import { GenericModal } from "../GenericModal/GenericModal";
import {
  useSuggestionStore,
  confirmSuggestion,
  rejectSuggestion,
  clearSuggestions,
  setSuggestions,
  setSuggestionsLoading,
  SuggestionEntry,
} from "@/store/SuggestionStore";
import { useExpensesStore } from "@/store/store";
import { API, Expense, Response, Tag } from "@/types/types";
import { Button, Spinner, Text, VStack, HStack, Box } from "@chakra-ui/react";
import { Tag as TagComp } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type SuggestTagsModalBodyProps = {
  suggestions: SuggestionEntry[];
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
  onApplyAll: () => void;
  onClose: () => void;
};

const SuggestTagsModalBody = ({
  suggestions,
  onConfirm,
  onReject,
  onApplyAll,
  onClose,
}: SuggestTagsModalBodyProps) => {
  const pendingCount = suggestions.filter((s) => !s.confirmed && !s.rejected).length;
  const confirmedCount = suggestions.filter((s) => s.confirmed).length;

  return (
    <>
      <Text fontSize="lg" mb={2}>
        Suggested Tags ({suggestions.length} untagged)
      </Text>
      <Text fontSize="sm" color="fg.subtle" mb={4}>
        {confirmedCount} confirmed · {pendingCount} pending
      </Text>

      <Box maxH="400px" overflowY="auto" mb={4}>
        <VStack gap={2} align="stretch">
          {suggestions.map((s) => (
            <Box
              key={s.expenseId}
              p={3}
              borderRadius="md"
              borderWidth="1px"
              borderColor={
                s.confirmed ? "green.500" : s.rejected ? "gray.600" : "border.DEFAULT"
              }
              bg={s.confirmed ? "green.900/10" : s.rejected ? "gray.800" : undefined}
            >
              <HStack justify="space-between">
                <Box flex={1}>
                  <Text fontSize="sm" css={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.description}</Text>
                  {s.confirmed ? (
                    <TagComp.Root colorPalette="green" size="sm" mt={1}>
                      <TagComp.Label>{s.suggestedTag} ✓</TagComp.Label>
                    </TagComp.Root>
                  ) : s.rejected ? (
                    <Text fontSize="xs" color="fg.subtle" mt={1}>Dismissed</Text>
                  ) : (
                    <TagComp.Root
                      colorPalette="purple"
                      size="sm"
                      mt={1}
                      cursor="pointer"
                      onClick={() => onConfirm(s.expenseId)}
                    >
                      <TagComp.Label>{s.suggestedTag}</TagComp.Label>
                    </TagComp.Root>
                  )}
                </Box>
                {!s.confirmed && !s.rejected && (
                  <HStack gap={2}>
                    <Button size="xs" colorPalette="green" onClick={() => onConfirm(s.expenseId)}>
                      Accept
                    </Button>
                    <Button size="xs" variant="outline" onClick={() => onReject(s.expenseId)}>
                      Dismiss
                    </Button>
                  </HStack>
                )}
              </HStack>
            </Box>
          ))}
        </VStack>
      </Box>

      <HStack justify="space-between">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Button
          colorPalette="green"
          onClick={onApplyAll}
          disabled={confirmedCount === 0}
        >
          Apply {confirmedCount > 0 ? `(${confirmedCount})` : ""}
        </Button>
      </HStack>
    </>
  );
};

export const SuggestTagsModal = () => {
  const suggestions = useSuggestionStore("suggestions");
  const loading = useSuggestionStore("loading");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const { value: storeValue } = useExpensesStore();
  const items = useMemo(() => Object.values(storeValue ?? {}) as Expense[], [storeValue]);

  const untaggedItemsRef = useRef<Expense[]>([]);
  untaggedItemsRef.current = useMemo(
    () => items.filter((item) => item.tags.length === 0),
    [items]
  );

  const fetchedRef = useRef(false);
  const downloadCheckedRef = useRef(false);

  const fetchSuggestions = useCallback(async () => {
    const untagged = untaggedItemsRef.current;
    if (untagged.length === 0) return;

    setSuggestionsLoading(true);
    setError(null);
    try {
      const descriptions = untagged.map((item) => item.description);

      const result = await invoke<Response<[string, string][]>>(API.SuggestTagsBulk, {
        descriptions,
      });

      if (result.status >= 400) {
        setError(result.header);
        fetchedRef.current = false;
        return;
      }

      const entries: SuggestionEntry[] = (result.message ?? []).map(
        ([desc, tag]: [string, string]) => {
          const item = untagged.find((i: Expense) => i.description === desc);
          return {
            expenseId: item?.id ?? "",
            description: desc,
            suggestedTag: tag,
            confirmed: false,
            rejected: false,
          };
        }
      ).filter((e: SuggestionEntry) => e.expenseId !== "");

      setSuggestions(entries);
    } catch (e) {
      setError(String(e));
      fetchedRef.current = false;
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchedRef.current) return;
    if (suggestions.length > 0) return;
    if (downloadCheckedRef.current) return;

    downloadCheckedRef.current = true;

    const ensureModel = async () => {
      setDownloading(true);
      try {
        const downloadResult = await invoke<Response<string>>(API.DownloadModel);

        if (downloadResult.status >= 400) {
          setError(downloadResult.header);
          return;
        }

        fetchedRef.current = true;
        fetchSuggestions();
      } catch (e) {
        setError(String(e));
      } finally {
        setDownloading(false);
      }
    };

    ensureModel();
  }, [suggestions.length, fetchSuggestions]);

  const handleRetry = useCallback(() => {
    setError(null);
    downloadCheckedRef.current = false;
    fetchedRef.current = false;
    clearSuggestions();
  }, []);

  const handleApplyAll = useCallback(async () => {
    setApplying(true);
    try {
      const confirmed = suggestions.filter((s) => s.confirmed);
      const hashes: string[] = [];
      const expenses: Expense[] = [];

      for (const s of confirmed) {
        const item = items.find((i) => i.id === s.expenseId);
        if (!item) continue;
        hashes.push(s.expenseId);
        expenses.push({
          ...item,
          tags: [...item.tags, s.suggestedTag as Tag],
        });
      }

      if (hashes.length > 0) {
        await invoke<Response<null>>(API.UpdateBulkExpenses, {
          hashes,
          expenses,
        });
      }

      clearSuggestions();
      closeAllOverlays();
    } catch (e) {
      setError(String(e));
    } finally {
      setApplying(false);
    }
  }, [suggestions, items]);

  const handleClose = useCallback(() => {
    clearSuggestions();
    closeAllOverlays();
  }, []);

  return (
    <GenericModal overlay={Overlay.SuggestTagsModal}>
      {downloading ? (
        <VStack py={8} gap={4}>
          <Spinner />
          <Text>Downloading model (~500 MB)...</Text>
          <Text fontSize="sm" color="fg.subtle">This may take a few minutes on first launch</Text>
        </VStack>
      ) : loading || applying ? (
        <VStack py={8} gap={4}>
          <Spinner />
          <Text>{applying ? "Applying tags..." : "Analyzing transactions..."}</Text>
        </VStack>
      ) : error ? (
        <VStack py={4} gap={4}>
          <Text color="red.400">Error: {error}</Text>
          <HStack gap={2}>
            <Button onClick={handleClose}>Close</Button>
            <Button onClick={handleRetry} colorPalette="blue">Retry</Button>
          </HStack>
        </VStack>
      ) : (
        <SuggestTagsModalBody
          suggestions={suggestions}
          onConfirm={confirmSuggestion}
          onReject={rejectSuggestion}
          onApplyAll={handleApplyAll}
          onClose={handleClose}
        />
      )}
    </GenericModal>
  );
};
