import { DataTable } from "@/components/DataTable/DataTable";
import styles from "./TableView.module.scss";
import {
  useFilteredExpenses,
  useFilteredIncome,
  useFilteredSavings,
} from "@/hooks/expenses";
import { useExpensesStore } from "@/store/store";
import { API, NonExpenseTags, Response } from "@/types/types";
import { createTauriInvoker } from "@/utils/utils";
import { downloadExpensesCSV } from "@/utils/download";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { toaster } from "@/components/ui/toaster";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Button,
  CloseButton,
  Dialog,
  Menu,
  Portal,
  Text,
} from "@chakra-ui/react";
import { LuFilter } from "react-icons/lu";
import { BsThreeDotsVertical } from "react-icons/bs";
import { enableOverlay, Overlay } from "@/store/OverlayStore";
import { useSelection, setSelection } from "@/store/SelectionStore";

const useFileOpener = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<
    Response<string[]> | Response<string> | null
  >(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string | undefined>(
    undefined
  );

  const pickFile = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setSelectedFormat(undefined);

    const file = await open({
      multiple: false,
      directory: false,
    });

    if (file) {
      const res: Response<string[]> = await invoke(API.OpenCSV, { file });
      setSelectedFile(file);
      setResult(res);
    }

    setLoading(false);
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setSelectedFile(null);
    setSelectedFormat(undefined);
  }, []);

  const parseFile = useCallback(async () => {
    if (!selectedFile || !selectedFormat) return;
    setLoading(true);
    const res = await invoke<Response<string>>(API.ParseCSV, {
      path: selectedFile,
      csvDefinitionKey: selectedFormat,
    });

    setResult(res);
    setLoading(false);
    if (res.status < 400) reset();
  }, [selectedFile, selectedFormat, reset]);

  return {
    loading,
    result,
    pickFile,
    selectedFile,
    selectedFormat,
    setSelectedFormat,
    parseFile,
    reset,
  };
};

const ResetExpensesDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { setValue: setExpenses } = useExpensesStore();
  const clearExpenses = async () => setExpenses({});

  return (
    <Dialog.Root
      role="alertdialog"
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
    >
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
                    onOpenChange(false);
                  }}
                >
                  Cancel
                </Button>
              </Dialog.ActionTrigger>
              <Button
                colorPalette="red"
                onClick={() => {
                  onOpenChange(false);
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
                  onOpenChange(false);
                }}
              />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

const DeleteSelectionDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const selection = useSelection();

  const handleDeleteSelection = useCallback(async () => {
    await invoke<Response<string>>(API.RemoveBulkExpenses, {
      hashes: selection,
    });
    setSelection([]);
  }, [selection]);

  return (
    <Dialog.Root
      role="alertdialog"
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Delete {selection.length} expense(s)?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>This action cannot be undone.</Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
              </Dialog.ActionTrigger>
              <Button
                colorPalette="red"
                onClick={() => {
                  handleDeleteSelection();
                  onOpenChange(false);
                }}
              >
                Delete
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton
                size="sm"
                onClick={() => onOpenChange(false)}
              />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export function TableView() {
  const expenses = useFilteredExpenses();
  const income = useFilteredIncome();
  const savings = useFilteredSavings();
  const { value: allStoreExpenses } = useExpensesStore();
  const {
    loading,
    result,
    pickFile,
    selectedFile,
    selectedFormat,
    setSelectedFormat,
    parseFile,
    reset,
  } = useFileOpener();

  const [includeIncome, setIncludeIncome] = useState(true);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [includeSavings, setIncludeSavings] = useState(true);
  const [includeUntagged, setIncludeUntagged] = useState(true);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteSelectionOpen, setDeleteSelectionOpen] = useState(false);
  const selection = useSelection();

  const allItems = useMemo(
    () => [...expenses, ...income, ...savings],
    [expenses, income, savings]
  );

  const typeFilteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const isIncome = item.tags.includes(NonExpenseTags.Income);
      const isSavings = item.tags.includes(NonExpenseTags.Savings);
      const isUntagged = item.tags.length === 0;
      const isExpense = !isIncome && !isSavings && !isUntagged;

      if (!includeIncome && isIncome) return false;
      if (!includeSavings && isSavings) return false;
      if (!includeExpenses && isExpense) return false;
      if (!includeUntagged && isUntagged) return false;
      return true;
    });
  }, [allItems, includeIncome, includeExpenses, includeSavings, includeUntagged]);

  const location = useLocation();

  useEffect(() => {
    if (location.state?.csvImport) {
      pickFile();
      window.history.replaceState({}, "");
    }
  }, [pickFile]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>CSV Import</span>
          {selectedFile && (
            <button className={styles.resetBtn} onClick={reset}>
              Clear
            </button>
          )}
        </div>

        {result && (
          <div
            className={`${styles.alert} ${result.status >= 400 ? styles.alertError : styles.alertSuccess}`}
          >
            <span>{result.header}</span>
            <span className={styles.alertMessage}>
              {typeof result.message === "string"
                ? result.message
                : Array.isArray(result.message)
                  ? result.message.join(", ")
                  : ""}
            </span>
          </div>
        )}

        {loading ? (
          <span className={styles.loadingText}>Loading...</span>
        ) : !selectedFile ? (
          <button className={styles.importBtn} onClick={pickFile}>
            Select CSV File
          </button>
        ) : (
          <div className={styles.formatRow}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>CSV Format</span>
              <select
                className={styles.fieldInput}
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
              >
                <option value="">Choose format...</option>
                {Array.isArray(result?.message)
                  ? result.message.map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))
                  : null}
              </select>
            </div>
            <button
              className={styles.parseBtn}
              disabled={!selectedFormat}
              onClick={parseFile}
            >
              Parse
            </button>
          </div>
        )}
      </div>

      <div className={`${styles.card} ${styles.tableCard}`}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>
            All Items ({allItems.length})
          </span>
          <div className={styles.actionRow}>
            <Menu.Root closeOnSelect={false}>
              <Menu.Trigger asChild>
                <Button size="sm" variant="outline">
                  <LuFilter size={14} />
                  Filter
                </Button>
              </Menu.Trigger>
              <Menu.Positioner>
                <Menu.Content>
                  <Menu.Item
                    value="income"
                    onClick={() => setIncludeIncome((v) => !v)}
                  >
                    <span
                      className={`${styles.filterIndicator} ${includeIncome ? styles.filterActive : ""}`}
                      style={{ color: "#38a169" }}
                    >
                      {includeIncome ? "\u25CF" : "\u25CB"}
                    </span>
                    Income
                  </Menu.Item>
                  <Menu.Item
                    value="expenses"
                    onClick={() => setIncludeExpenses((v) => !v)}
                  >
                    <span
                      className={`${styles.filterIndicator} ${includeExpenses ? styles.filterActive : ""}`}
                      style={{ color: "#fc8181" }}
                    >
                      {includeExpenses ? "\u25CF" : "\u25CB"}
                    </span>
                    Expenses
                  </Menu.Item>
                  <Menu.Item
                    value="savings"
                    onClick={() => setIncludeSavings((v) => !v)}
                  >
                    <span
                      className={`${styles.filterIndicator} ${includeSavings ? styles.filterActive : ""}`}
                      style={{ color: "#ecc94b" }}
                    >
                      {includeSavings ? "\u25CF" : "\u25CB"}
                    </span>
                    Savings
                  </Menu.Item>
                  <Menu.Item
                    value="untagged"
                    onClick={() => setIncludeUntagged((v) => !v)}
                  >
                    <span
                      className={`${styles.filterIndicator} ${includeUntagged ? styles.filterActive : ""}`}
                    >
                      {includeUntagged ? "\u25CF" : "\u25CB"}
                    </span>
                    Untagged
                  </Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Menu.Root>

            <Menu.Root>
              <Menu.Trigger asChild>
                <Button size="sm" variant="ghost" className={styles.kebabBtn}>
                  <BsThreeDotsVertical size={16} />
                </Button>
              </Menu.Trigger>
              <Menu.Positioner>
                <Menu.Content>
                  <Menu.Item
                    value="download"
                    onClick={async () => {
                      const path = await downloadExpensesCSV(allStoreExpenses);
                      if (path) {
                        toaster.create({
                          title: "CSV exported",
                          description: "File saved successfully",
                          type: "success",
                          action: {
                            label: "Open folder",
                            onClick: () => revealItemInDir(path),
                          },
                        });
                      }
                    }}
                  >
                    Download CSV
                  </Menu.Item>
                  <Menu.Item
                    value="new-window"
                    onClick={createTauriInvoker(API.NewWindow)}
                  >
                    New Window
                  </Menu.Item>
                  <Menu.Item
                    value="create-expense"
                    onClick={() => enableOverlay(Overlay.ManualModal)}
                  >
                    Create Expense
                  </Menu.Item>
                  {selection.length > 0 && (
                    <>
                      <Menu.Separator />
                      <Menu.Item
                        value="tag-selection"
                        onClick={() => enableOverlay(Overlay.TagModal)}
                      >
                        Tag Selection
                      </Menu.Item>
                      <Menu.Item
                        value="modify-selection"
                        onClick={() => enableOverlay(Overlay.EditModal)}
                      >
                        Modify Selection
                      </Menu.Item>
                      <Menu.Item
                        value="delete-selection"
                        onClick={() => setDeleteSelectionOpen(true)}
                        colorPalette="red"
                      >
                        Delete Selection
                      </Menu.Item>
                    </>
                  )}
                  <Menu.Separator />
                  <Menu.Item
                    value="delete-all"
                    onClick={() => setDeleteAllOpen(true)}
                    colorPalette="red"
                  >
                    Delete All
                  </Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Menu.Root>
          </div>
        </div>
        <DataTable items={typeFilteredItems} />
      </div>

      <ResetExpensesDialog
        open={deleteAllOpen}
        onOpenChange={setDeleteAllOpen}
      />
      <DeleteSelectionDialog
        open={deleteSelectionOpen}
        onOpenChange={setDeleteSelectionOpen}
      />
    </div>
  );
}
