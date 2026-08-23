import { closeAllOverlays, Overlay } from "@/store/OverlayStore";
import { GenericModal } from "../GenericModal/GenericModal";
import { Alert, Button, Input, Spinner, Text, VStack } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { setSelection, useSelection } from "@/store/SelectionStore";
import { useGetExpenseById } from "@/hooks/expenses";
import { API, Expense, Response } from "@/types/types";
import { invoke } from "@tauri-apps/api/core";
import { useAllGroups } from "@/utils/tags";
import { INCOME_GROUP, SAVINGS_GROUP } from "@/utils/expense-utils";
import { preventDoubleClick, SHORTCUT_COOLDOWN } from "@/utils/utils";

export const GroupModal = () => {
  const onClose = useCallback(() => {
    setResult(null);
    setGroup("");
    setSelection([]);
    closeAllOverlays();
  }, []);

  const ALL_GROUPS = useAllGroups();

  const selection = useSelection();
  const [result, setResult] = useState<
    Response<string> | Response<null> | null
  >(null);

  const [loading, setLoading] = useState(false);

  const [group, setGroup] = useState("");

  const getExpenseById = useGetExpenseById();

  const handleSave = useCallback(
    preventDoubleClick(
    async (groupStr: string) => {
      setLoading(true);
      const nextGroup = groupStr.trim() || undefined;

      const hashes = selection.filter((expenseId) => {
        const expense = getExpenseById(expenseId);
        return expense !== undefined;
      });

      const expensesToUpdate: Expense[] = hashes.map((expenseId) => {
        const expense = getExpenseById(expenseId)!;

        return {
          ...expense,
          group: nextGroup,
        };
      });

      await invoke<Response<null>>(API.UpdateBulkExpenses, {
        hashes,
        expenses: expensesToUpdate,
      });

      setLoading(false);
      onClose();
    }, SHORTCUT_COOLDOWN),
    [selection]
  );

  return (
    <GenericModal overlay={Overlay.GroupModal}>
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
            Set Group for Selected Expenses ({selection.length})
          </Text>
          <VStack>
            <Input
              type="text"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="Group name (e.g. Japan Trip)"
              list="group-modal-groups"
            />
            <datalist id="group-modal-groups">
              {ALL_GROUPS.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
            {group.trim() === INCOME_GROUP && (
              <Text fontSize="sm" color="green.400">
                Will be classified as Income
              </Text>
            )}
            {group.trim() === SAVINGS_GROUP && (
              <Text fontSize="sm" color="yellow.400">
                Will be classified as Savings
              </Text>
            )}
            <Text fontSize="sm" color="fg.muted">
              Leave empty to remove the selected expenses from their group.
            </Text>
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

            <Button data-primary="true" colorPalette="green" onClick={() => handleSave(group)}>
              Save
            </Button>
          </div>
        </>
      )}
    </GenericModal>
  );
};
