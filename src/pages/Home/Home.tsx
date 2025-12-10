import { useExpensesStore } from "@/store/store";
import { MOCK_EXPENSES } from "@/types/mockExpenses";
import { API } from "@/types/types";
import { createTauriInvoker } from "@/utils/utils";
import {
  Button,
  CloseButton,
  Dialog,
  Heading,
  Portal,
  Separator,
} from "@chakra-ui/react";
import { useState } from "react";
import logo from "../../assets/logo.png";
import styles from "./Home.module.scss";

export function Home() {
  const { value: expenses, setValue: setExpenses } = useExpensesStore();
  const setExpensesMock = async () => setExpenses(MOCK_EXPENSES);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        padding: "1rem",
        paddingTop: "3rem",
        height: "100%",
        alignItems: "center",
      }}
    >
      <Heading size="3xl">Expense Tracker</Heading>
      <img src={logo} alt="Expense Tracker Logo" className={styles.img} />
      <Heading size="2xl">V2</Heading>

      <Separator style={{ width: "100%" }} />

      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Button
          onClick={createTauriInvoker(API.NewWindow)}
          colorPalette={"blue"}
        >
          Open new window
        </Button>
        <ResetExpensesDialog />
        <Button onClick={setExpensesMock} colorPalette={"green"}>
          Mock expenses list
        </Button>
      </div>

      <p>There are {expenses?.length} expenses</p>
    </div>
  );
}

const ResetExpensesDialog = () => {
  const { setValue: setExpenses } = useExpensesStore();
  const clearExpenses = async () => setExpenses({});
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root role="alertdialog" open={open}>
      <Dialog.Trigger asChild>
        <Button size="sm" colorPalette={"red"} onClick={() => setOpen(true)}>
          Delete All Expenses
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Are you sure?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <p>
                This action cannot be undone. This will permanently delete all
                entries
              </p>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                  }}
                >
                  Cancel
                </Button>
              </Dialog.ActionTrigger>
              <Button
                colorPalette="red"
                onClick={() => {
                  setOpen(false);
                  clearExpenses();
                }}
              >
                Delete
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton
                size="sm"
                onClick={() => {
                  setOpen(false);
                }}
              />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
