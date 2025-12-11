import { closeAllOverlays, Overlay } from "@/store/OverlayStore";
import { GenericModal } from "../GenericModal/GenericModal";
import { Alert, Button, Text, VStack } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { setSelection, useSelection } from "@/store/SelectionStore";
import { useGetExpenseById } from "@/hooks/expenses";
import { ALL_TAGS_OPTIONS, API, Expense, Response, Tag } from "@/types/types";
import { invoke } from "@tauri-apps/api/core";
import { MultiSelectInput } from "../ExpenseForm/MultiSelectInput";

export const TagModal = () => {
  const onClose = useCallback(() => {
    setResult(null);
    setTags([]);
    setSelection([]);
    closeAllOverlays();
  }, []);

  const selection = useSelection();
  const [result, setResult] = useState<
    Response<string> | Response<null> | null
  >(null);
  const [tags, setTags] = useState<string[]>([]);

  const getExpenseById = useGetExpenseById();

  const handleSave = useCallback(
    async (tagsStr: string[]) => {
      const tags = tagsStr as Tag[];

      for (const expenseId of selection) {
        const expense = getExpenseById(expenseId);
        if (!expense) continue;
        const updatedExpense: Expense = {
          ...expense,
          tags,
        };

        await invoke<Response<null>>(API.UpdateExpense, {
          hash: updatedExpense.id,
          expense: updatedExpense,
        });
      }

      onClose();
    },
    [selection]
  );

  return (
    <GenericModal overlay={Overlay.TagModal}>
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

        <Button colorPalette="green" onClick={() => handleSave(tags)}>
          Save
        </Button>
      </div>
    </GenericModal>
  );
};
