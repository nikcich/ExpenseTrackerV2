import { closeAllOverlays, Overlay } from "@/store/OverlayStore";
import { GenericModal } from "../GenericModal/GenericModal";
import { Alert, Button, Spinner, Text, VStack } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { setSelection, useSelection } from "@/store/SelectionStore";
import { useGetExpenseById } from "@/hooks/expenses";
import { Expense, Response, Tag } from "@/types/types";
import { MultiSelectInput } from "../ExpenseForm/MultiSelectInput";
import { useAllTagsOptions } from "@/utils/tags";
import { preventDoubleClick, SHORTCUT_COOLDOWN } from "@/utils/utils";
import { useExpenseTrackerService } from "@/services/ServiceProvider";

export const TagModal = () => {
  const service = useExpenseTrackerService();
  const onClose = useCallback(() => {
    setResult(null);
    setTags([]);
    setSelection([]);
    closeAllOverlays();
  }, []);

  const ALL_TAGS_OPTIONS = useAllTagsOptions();

  const selection = useSelection();
  const [result, setResult] = useState<
    Response<string> | Response<null> | null
  >(null);

  const [loading, setLoading] = useState(false);

  const [tags, setTags] = useState<string[]>([]);

  const getExpenseById = useGetExpenseById();

  const handleSave = useCallback(
    preventDoubleClick(
    async (tagsStr: string[]) => {
      setLoading(true);
      const tags = tagsStr as Tag[];

      const hashes = selection.filter((expenseId) => {
        const expense = getExpenseById(expenseId);
        return expense !== undefined;
      });

      const expensesToUpdate: Expense[] = hashes.map((expenseId) => {
        const expense = getExpenseById(expenseId)!;

        return {
          ...expense,
          tags,
        };
      });

      await service.updateBulkExpenses(hashes, expensesToUpdate);

      setLoading(false);
      onClose();
    }, SHORTCUT_COOLDOWN),
    [selection, service]
  );

  return (
    <GenericModal overlay={Overlay.TagModal}>
      {loading && <Spinner />}
      {!loading && (
        <>
          <div
            style={{
              height: "3.25rem",
              marginBottom: "1.5rem",
              display: result ? "flex" : "none",
            }}
          >
            {result && (
              <Alert.Root status={result.status >= 400 ? "error" : "success"}>
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>{`${result.header}`}</Alert.Title>
                </Alert.Content>
              </Alert.Root>
            )}
          </div>
          <Text fontSize="lg" mb={4}>
            Tag Selected Expenses ({selection.length})
          </Text>
          <VStack>
            <MultiSelectInput
              options={ALL_TAGS_OPTIONS}
              value={ALL_TAGS_OPTIONS.filter((o) => tags.includes(o.value))}
              onChange={(v) => {
                setTags(v);
              }}
              label="Tags"
              placeholder="Select Tags"
            />
          </VStack>

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              gap: "8px",
              marginTop: "16px",
            }}
          >
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>

            <Button data-primary="true" colorPalette="green" onClick={() => handleSave(tags)}>
              Save
            </Button>
          </div>
        </>
      )}
    </GenericModal>
  );
};
