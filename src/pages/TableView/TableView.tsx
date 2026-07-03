import { DataTable } from "@/components/DataTable/DataTable";
import styles from "./TableView.module.scss";
import {
  useFilteredExpenses,
  useFilteredIncome,
  useFilteredSavings,
} from "@/hooks/expenses";
import { API, Response } from "@/types/types";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useState } from "react";

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

  const parseFile = useCallback(async () => {
    if (!selectedFile || !selectedFormat) return;
    setLoading(true);
    const res = await invoke<Response<string>>(API.ParseCSV, {
      path: selectedFile,
      csvDefinitionKey: selectedFormat,
    });

    setResult(res);
    setLoading(false);
  }, [selectedFile, selectedFormat]);

  const reset = useCallback(() => {
    setResult(null);
    setSelectedFile(null);
    setSelectedFormat(undefined);
  }, []);

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

export function TableView() {
  const expenses = useFilteredExpenses();
  const income = useFilteredIncome();
  const savings = useFilteredSavings();
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
        </div>
        <DataTable items={allItems} />
      </div>
    </div>
  );
}
