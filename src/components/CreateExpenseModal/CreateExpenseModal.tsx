import { closeAllOverlays, Overlay } from "@/store/OverlayStore";
import { GenericModal } from "../GenericModal/GenericModal";
import { Alert, Button, Text, VStack } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { ExpenseForm } from "../ExpenseForm/ExpenseForm";
import { API, Expense, Response } from "@/types/types";
import { invoke } from "@tauri-apps/api/core";

export const CreateExpenseModal = () => {
  const onClose = useCallback(() => {
    setResult(null);
    closeAllOverlays();
  }, []);

  const [result, setResult] = useState<
    Response<string> | Response<null> | null
  >(null);

  const handleCreateExpense = useCallback(async (partial: Partial<Expense>) => {
    const updatedExpense: Expense = {
      id: "",
      amount: 0,
      description: "",
      date: "",
      tags: [],
      ...partial,
    };

    const res = await invoke<Response<null>>(API.AddManualExpense, {
      expense: updatedExpense,
    });

    setResult(res);

    if (res.status >= 400) {
      console.error(res.header);
      return;
    }

    onClose();
  }, []);

  return (
    <GenericModal overlay={Overlay.ManualModal}>
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
        Create Expense
      </Text>
      <VStack>
        <ExpenseForm
          expense={undefined}
          onSubmit={(partial: Partial<Expense>) => handleCreateExpense(partial)}
          type="create"
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
      </div>
    </GenericModal>
  );
};
