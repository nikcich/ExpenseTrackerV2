import { useExpensesStore } from "@/store/store";
import { MOCK_EXPENSES } from "@/types/mockExpenses";
import { API } from "@/types/types";
import { createTauriInvoker } from "@/utils/utils";
import { Button } from "@chakra-ui/react";

export function Home() {
  const { value: expenses, setValue: setExpenses } = useExpensesStore();

  const clearExpenses = async () => setExpenses({});
  const setExpensesMock = async () => setExpenses(MOCK_EXPENSES);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        padding: "1rem",
        height: "100%",
      }}
    >
      <Button onClick={createTauriInvoker(API.NewWindow)} colorPalette={"blue"}>
        Open new window
      </Button>
      <Button onClick={clearExpenses} colorPalette={"red"}>
        Reset expenses list
      </Button>
      <Button onClick={setExpensesMock} colorPalette={"green"}>
        Mock expenses list
      </Button>
      <p>There are {expenses?.length} expenses</p>
    </div>
  );
}
