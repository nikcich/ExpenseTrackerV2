import { closeAllOverlays, Overlay } from "@/store/OverlayStore";
import { GenericModal } from "../GenericModal/GenericModal";
import { Alert, Button, Text, VStack } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { useSelection } from "@/store/SelectionStore";
import { useGetExpenseById } from "@/hooks/expenses";
import { ExpenseForm } from "../ExpenseForm/ExpenseForm";
import { API, Expense, Response } from "@/types/types";
import { invoke } from "@tauri-apps/api/core";

export const EditModal = () => {
  const onClose = useCallback(() => {
    setResult(null);
    setSelectedExpenseIndex(0);
    closeAllOverlays();
  }, []);

  const selection = useSelection();
  const [result, setResult] = useState<
    Response<string> | Response<null> | null
  >(null);
  const [selectedExpenseIndex, setSelectedExpenseIndex] = useState(0);
  const getExpenseById = useGetExpenseById();

  const handlePrevExpense = () => {
    setSelectedExpenseIndex((prevIndex) =>
      prevIndex === 0 ? selection.length - 1 : prevIndex - 1
    );
  };

  const handleNextExpense = () => {
    setSelectedExpenseIndex((prevIndex) =>
      prevIndex === selection.length - 1 ? prevIndex : prevIndex + 1
    );
  };

  const handleSaveExpense = useCallback(
    async (partial: Partial<Expense>, expense: Expense) => {
      const updatedExpense: Expense = {
        ...expense,
        ...partial,
      };

      const res = await invoke<Response<null>>(API.UpdateExpense, {
        hash: updatedExpense.id,
        expense: updatedExpense,
      });

      setResult(res);

      if (res.status >= 400) {
        console.error(res.header);
        return;
      }

      if (selectedExpenseIndex < selection.length - 1) {
        handleNextExpense();
      } else {
        onClose();
      }
    },
    []
  );

  return (
    <GenericModal overlay={Overlay.EditModal}>
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
        Edit Expense {selectedExpenseIndex + 1} of {selection.length}
      </Text>
      <VStack>
        {selection
          .map((eid) => getExpenseById(eid))
          .filter((e) => e !== undefined)
          .map((expense, index) => (
            <div
              key={expense.id}
              style={{
                display: index === selectedExpenseIndex ? "block" : "none",
                width: "100%",
              }}
            >
              {selectedExpenseIndex === index && (
                <ExpenseForm
                  expense={expense}
                  onSubmit={(partial: Partial<Expense>) =>
                    handleSaveExpense(partial, expense)
                  }
                  type="edit"
                />
              )}
            </div>
          ))}
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
        <div style={{ display: "flex", gap: "8px" }}>
          <Button
            onClick={handlePrevExpense}
            disabled={selectedExpenseIndex === 0}
          >
            Prev
          </Button>
          <Button
            onClick={handleNextExpense}
            disabled={selectedExpenseIndex === selection.length - 1}
          >
            Next
          </Button>
        </div>
      </div>
    </GenericModal>
  );
};
