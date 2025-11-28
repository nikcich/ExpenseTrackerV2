import { useExpensesStore } from "@/store/store";
import { MOCK_EXPENSES } from "@/types/mockExpenses";
import { API } from "@/types/types";
import { createTauriInvoker } from "@/utils/utils";
import { Button } from "@chakra-ui/react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export function Home() {
  const { value: expenses, setValue: setExpenses } = useExpensesStore();
  console.log(expenses);

  const clearExpenses = async () => setExpenses([]);
  const setExpensesMock = async () => setExpenses(MOCK_EXPENSES);

  const openFile = async () => {
    console.log("opening file");
    const file = await open({
      multiple: false,
      directory: false,
    });

    if (file) {
      await invoke(API.ParseCSV, { file });
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        padding: "1rem",
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

      <Button onClick={openFile} colorPalette={"purple"}>
        Open File
      </Button>
    </div>
  );
}
