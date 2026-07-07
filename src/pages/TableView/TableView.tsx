import { DataTable } from "@/components/DataTable/DataTable";
import styles from "./TableView.module.scss";
import {
  useFilteredExpenses,
  useFilteredIncome,
  useFilteredSavings,
} from "@/hooks/expenses";
import { useExpensesStore } from "@/store/store";
import { API, Response } from "@/types/types";
import { createTauriInvoker } from "@/utils/utils";
import { downloadExpensesCSV } from "@/utils/download";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Button,
  CloseButton,
  Dialog,
  Portal,
} from "@chakra-ui/react";

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

const ResetExpensesDialog = () => {
  const { setValue: setExpenses } = useExpensesStore();
  const clearExpenses = async () => setExpenses({});
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root role="alertdialog" open={open}>
      <Dialog.Trigger asChild>
        <Button size="sm" colorPalette={"red"} onClick={() => setOpen(true)}>
          Delete All
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
                  onClick={() => { setOpen(false); }}
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
                onClick={() => { setOpen(false); }}
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

  const allItems = [...expenses, ...income, ...savings];
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
            <Button
              size="sm"
              colorPalette={"green"}
              onClick={() => downloadExpensesCSV(allStoreExpenses)}
            >
              Download CSV
            </Button>
            <Button
              size="sm"
              colorPalette={"blue"}
              onClick={createTauriInvoker(API.NewWindow)}
            >
              New Window
            </Button>
            <ResetExpensesDialog />
          </div>
        </div>
        <DataTable items={allItems} />
      </div>
    </div>
  );
}
