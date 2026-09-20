import { GenericPage } from "@/components/GenericPage/GenericPage";
import { Tooltip } from "@/components/ui/tooltip";
import {
  useCustomCsvDefinitions,
  useExpensesStore,
  useImportHistory,
} from "@/store/store";
import type { DynamicCsvDefinition, PreviewResult, Response } from "@/types/types";
import { Spinner } from "@chakra-ui/react";
import { LuInfo } from "react-icons/lu";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useExpenseTrackerService } from "@/services/ServiceProvider";
import { useLocation } from "react-router-dom";
import {
  downloadExpensesCSV,
  exportAllData,
  importAllData,
} from "@/utils/download";
import { toaster } from "@/components/ui/toaster";
import styles from "./Data.module.scss";

const emptyForm = (): Omit<DynamicCsvDefinition, "id"> => ({
  name: "",
  hasHeaders: true,
  dateColumn: { index: 0, format: "%m/%d/%Y" },
  descriptionColumn: { index: 1 },
  amountColumn: { index: 2, inverted: false },
  tagColumn: undefined,
  groupColumn: undefined,
  creditDebitColumn: undefined,
});

const useFileOpener = (appendImportDate: (date: string) => void) => {
  const service = useExpenseTrackerService();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<
    Response<string[]> | Response<string> | null
  >(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string | undefined>(
    undefined
  );
  const { definitions } = useCustomCsvDefinitions();

  const pickFile = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setSelectedFormat(undefined);

    const file = (await service.openFileDialog({
      multiple: false,
      directory: false,
    })) as string | null;

    if (file) {
      const customJson = definitions.length > 0 ? JSON.stringify(definitions) : undefined;
      const res: Response<string[]> = await service.openCsvFromPath(file, customJson);
      setSelectedFile(file);
      setResult(res);
    }

    setLoading(false);
  }, [service, definitions]);

  const reset = useCallback(() => {
    setResult(null);
    setSelectedFile(null);
    setSelectedFormat(undefined);
  }, []);

  const parseFile = useCallback(async () => {
    if (!selectedFile || !selectedFormat) return;
    setLoading(true);
    const customJson = definitions.length > 0 ? JSON.stringify(definitions) : undefined;
    const res = await service.parseCsvFromPath(selectedFile, selectedFormat, customJson);

    if (res.status < 400 && res.message) {
      appendImportDate(res.message.importDate);
      setResult({ status: res.status, header: res.header, message: res.message.message });
    } else {
      setResult({ status: res.status, header: res.header, message: typeof res.message === "string" ? res.message : null });
    }
    setLoading(false);
    if (res.status < 400) reset();
  }, [selectedFile, selectedFormat, reset, definitions, appendImportDate, service]);

  return {
    loading,
    result,
    pickFile,
    selectedFile,
    selectedFormat,
    setSelectedFormat,
    parseFile,
    reset,
    definitions,
  };
};

export function Data() {
  const service = useExpenseTrackerService();
  const { definitions, addDefinition, updateDefinition, removeDefinition } =
    useCustomCsvDefinitions();

  const { value: allStoreExpenses } = useExpensesStore();
  const { importHistory, setImportHistory } = useImportHistory();

  const appendImportDate = useCallback(
    (date: string) => {
      setImportHistory([...(importHistory ?? []), date]);
    },
    [importHistory, setImportHistory]
  );

  const {
    loading,
    result,
    pickFile,
    selectedFile,
    selectedFormat,
    setSelectedFormat,
    parseFile,
    reset,
  } = useFileOpener(appendImportDate);

  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [parseResults, setParseResults] = useState<PreviewResult[]>([]);
  const [parseLoading, setParseLoading] = useState(false);
  const [parsedSnapshot, setParsedSnapshot] = useState<{ form: string; path: string | null } | null>(null);

  const location = useLocation();

  useEffect(() => {
    if (location.state?.csvImport) {
      pickFile();
      window.history.replaceState({}, "");
    }
  }, [pickFile]);

  const isStale = useMemo(() => {
    if (!parsedSnapshot || parseResults.length === 0) return false;
    return parsedSnapshot.form !== JSON.stringify(form) || parsedSnapshot.path !== previewPath;
  }, [parsedSnapshot, parseResults.length, form, previewPath]);

  const handlePreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const path = await service.openFileDialog({
        multiple: false,
        directory: false,
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });
      if (!path) {
        setPreviewLoading(false);
        return;
      }
      const filePath = typeof path === "string" ? path : path[0];
      setPreviewPath(filePath);
      const res = await service.readCsvPreview(filePath, 10);
      setPreviewData(res.message ?? []);
    } catch {
      setPreviewData([]);
      setPreviewPath(null);
    }
    setPreviewLoading(false);
  }, [service]);

  const handleSave = useCallback(() => {
    if (!form.name) return;
    if (editingId) {
      updateDefinition({ ...form, id: editingId } as DynamicCsvDefinition);
    } else {
      addDefinition({ ...form, id: crypto.randomUUID() } as DynamicCsvDefinition);
    }
    setForm(emptyForm());
    setEditingId(null);
  }, [form, editingId, addDefinition, updateDefinition]);

  const handleEdit = useCallback(
    (def: DynamicCsvDefinition) => {
      setForm({
        name: def.name,
        hasHeaders: def.hasHeaders,
        dateColumn: { ...def.dateColumn },
        descriptionColumn: { ...def.descriptionColumn },
        amountColumn: { ...def.amountColumn },
        tagColumn: def.tagColumn ? { ...def.tagColumn } : undefined,
        groupColumn: def.groupColumn ? { ...def.groupColumn } : undefined,
        creditDebitColumn: def.creditDebitColumn
          ? { ...def.creditDebitColumn }
          : undefined,
      });
      setEditingId(def.id);
    },
    []
  );

  const handleCancel = useCallback(() => {
    setForm(emptyForm());
    setEditingId(null);
  }, []);

  const handleParsePreview = useCallback(async () => {
    if (!previewPath) return;
    setParseLoading(true);
    try {
      const defJson = JSON.stringify({ ...form, id: "preview" });
      const res = await service.previewCsvParse(previewPath, defJson);
      setParseResults(res.message ?? []);
      setParsedSnapshot({ form: JSON.stringify(form), path: previewPath });
    } catch {
      setParseResults([]);
    }
    setParseLoading(false);
  }, [previewPath, form, service]);

  const handleExportCsv = useCallback(async () => {
    const path = await downloadExpensesCSV(allStoreExpenses);
    if (path) {
      toaster.create({
        title: "CSV exported",
        description: "File saved successfully",
        type: "success",
        action: {
          label: "Open folder",
          onClick: () => service.revealItemInDir(path),
        },
      });
    }
  }, [allStoreExpenses, service]);

  const handleExportBackup = useCallback(async () => {
    try {
      const path = await exportAllData();
      if (path) {
        toaster.create({
          title: "Export complete",
          description: `Saved to ${path}`,
          type: "success",
        });
      }
    } catch (e) {
      toaster.create({
        title: "Export failed",
        description: String(e),
        type: "error",
      });
    }
  }, []);

  const handleImportBackup = useCallback(async () => {
    try {
      const keys = await importAllData();
      if (keys.length > 0) {
        toaster.create({
          title: "Import complete",
          description: `Imported: ${keys.join(", ")}`,
          type: "success",
        });
      }
    } catch (e) {
      toaster.create({
        title: "Import failed",
        description: String(e),
        type: "error",
      });
    }
  }, []);

  const maxCols =
    previewData.length > 0
      ? Math.max(...previewData.map((r) => r.length))
      : 0;

  return (
    <GenericPage title="Data" hasRange={false} needsData={false}>
      <div className={styles.page}>
        {previewLoading && (
          <div className={styles.loadingOverlay}>
            <Spinner size="xl" color="var(--fg-info, #60a5fa)" />
            <span className={styles.loadingText}>Reading CSV...</span>
          </div>
        )}

        <div className={styles.section}>
          <div className={styles.importHeader}>
            <span className={styles.sectionTitle}>CSV Import</span>
            {selectedFile && (
              <button className={styles.btn} onClick={reset}>
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
            <button className={styles.previewBtn} onClick={pickFile}>
              Select CSV File
            </button>
          ) : (
            <div className={styles.formatRow}>
              <div className={styles.formatField}>
                <span className={styles.fieldLabel}>CSV Format</span>
                <select
                  className={styles.fieldInput}
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                >
                  <option value="">Choose format...</option>
                  {Array.isArray(result?.message)
                    ? result.message.map((key) => {
                        const customDef = definitions.find((d) => d.id === key);
                        const label = customDef?.name ?? key;
                        return (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        );
                      })
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

        <div className={styles.section}>
          <span className={styles.sectionTitle}>Export & Backup</span>
          <span className={styles.emptyText}>
            Export all expenses to CSV, back up the full dataset to JSON, or
            restore from a previous backup.
          </span>
          <div className={styles.actionsRow}>
            <button className={styles.primaryBtn} onClick={handleExportCsv}>
              Export CSV
            </button>
            <button className={styles.primaryBtn} onClick={handleExportBackup}>
              Export Full Backup
            </button>
            <button className={styles.btn} onClick={handleImportBackup}>
              Import Backup
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <span className={styles.sectionTitle}>CSV Preview</span>
          <button className={styles.previewBtn} onClick={handlePreview}>
            {previewLoading ? "Loading..." : "Select CSV File"}
          </button>
          {previewData.length > 0 && (
            <div className={styles.tableScroll}>
              <table className={styles.previewTable}>
                <thead>
                  <tr>
                    <th></th>
                    {Array.from({ length: maxCols }, (_, i) => (
                      <th key={i} className={styles.indexCell}>
                        Col {i}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      <td className={styles.indexCell}>Row {rowIdx}</td>
                      {Array.from({ length: maxCols }, (_, colIdx) => (
                        <td key={colIdx}>{row[colIdx] ?? ""}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={styles.section}>
          <span className={styles.sectionTitle}>
            {editingId ? "Edit Format" : "New Format"}
          </span>

          <div className={styles.formGrid}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Name</span>
              <input
                className={styles.fieldInput}
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. My Bank CSV"
              />
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Date Column Index</span>
              <input
                className={styles.fieldInput}
                type="number"
                min="0"
                value={form.dateColumn.index}
                onChange={(e) =>
                  setForm({
                    ...form,
                    dateColumn: { ...form.dateColumn, index: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Date Format</span>
              <input
                className={styles.fieldInput}
                type="text"
                value={form.dateColumn.format}
                onChange={(e) =>
                  setForm({
                    ...form,
                    dateColumn: { ...form.dateColumn, format: e.target.value },
                  })
                }
                placeholder="%m/%d/%Y"
              />
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Description Column</span>
              <input
                className={styles.fieldInput}
                type="number"
                min="0"
                value={form.descriptionColumn.index}
                onChange={(e) =>
                  setForm({
                    ...form,
                    descriptionColumn: { index: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Amount Column</span>
              <input
                className={styles.fieldInput}
                type="number"
                min="0"
                value={form.amountColumn.index}
                onChange={(e) =>
                  setForm({
                    ...form,
                    amountColumn: { ...form.amountColumn, index: Number(e.target.value) },
                  })
                }
              />
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Tag Column (optional)</span>
              <input
                className={styles.fieldInput}
                type="number"
                min="0"
                value={form.tagColumn?.index ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    tagColumn: e.target.value
                      ? { index: Number(e.target.value) }
                      : undefined,
                  })
                }
                placeholder="None"
              />
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>
                Group Column (optional)
                <Tooltip content="Optional column assigning each row to a group (e.g. a trip or project name). Empty cells are fine — the row just gets no group.">
                  <span className={styles.infoIcon}><LuInfo size={13} /></span>
                </Tooltip>
              </span>
              <input
                className={styles.fieldInput}
                type="number"
                min="0"
                value={form.groupColumn?.index ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    groupColumn: e.target.value
                      ? { index: Number(e.target.value) }
                      : undefined,
                  })
                }
                placeholder="None"
              />
            </div>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>
                Credit/Debit Column (optional)
                <Tooltip content="Some banks have a column indicating Credit or Debit per row. Set this to that column index, and set the Credit Value to the string that means credit (e.g. 'Credit'). The parser will negate the amount for credit rows.">
                  <span className={styles.infoIcon}><LuInfo size={13} /></span>
                </Tooltip>
              </span>
              <input
                className={styles.fieldInput}
                type="number"
                min="0"
                value={form.creditDebitColumn?.index ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    creditDebitColumn: e.target.value
                      ? {
                          index: Number(e.target.value),
                          creditQuery: form.creditDebitColumn?.creditQuery ?? "Credit",
                        }
                      : undefined,
                  })
                }
                placeholder="None"
              />
            </div>

            {form.creditDebitColumn && (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>
                  Credit Value
                  <Tooltip content="The exact text in your Credit/Debit column that means the row is a credit (money in). When matched, the parser negates the amount. Check your CSV — it might be 'Credit', 'CREDIT', 'CR', 'ACH Credit', etc.">
                    <span className={styles.infoIcon}><LuInfo size={13} /></span>
                  </Tooltip>
                </span>
                <input
                  className={styles.fieldInput}
                  type="text"
                  value={form.creditDebitColumn.creditQuery}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      creditDebitColumn: form.creditDebitColumn
                        ? { ...form.creditDebitColumn, creditQuery: e.target.value }
                        : undefined,
                    })
                  }
                  placeholder="Credit"
                />
              </div>
            )}

            <div className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={form.hasHeaders}
                onChange={(e) => setForm({ ...form, hasHeaders: e.target.checked })}
              />
              <span className={styles.checkboxLabel}>Has Headers</span>
            </div>

            <div className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={form.amountColumn.inverted}
                onChange={(e) =>
                  setForm({
                    ...form,
                    amountColumn: { ...form.amountColumn, inverted: e.target.checked },
                  })
                }
              />
              <span className={styles.checkboxLabel}>Inverted Amount Sign</span>
            </div>
          </div>

          <div className={styles.actionsRow}>
            <button className={styles.primaryBtn} onClick={handleSave} disabled={!form.name.trim()}>
              {editingId ? "Update Format" : "Save Format"}
            </button>
            {editingId && (
              <button className={styles.btn} onClick={handleCancel}>
                Cancel
              </button>
            )}
            {previewData.length > 0 && (
              <button
                className={styles.primaryBtn}
                onClick={handleParsePreview}
                disabled={parseLoading || !form.name}
              >
                {parseLoading ? "Parsing..." : "Run Preview"}
              </button>
            )}
          </div>

          {parseResults.length > 0 && (
            <>
              <div className={styles.parseSummary}>
                <span>
                  {parseResults.filter((r) => r.expense).length}/{parseResults.length} rows parsed successfully
                </span>
                {isStale && <span className={styles.staleBadge}>STALE — form or file changed</span>}
              </div>
              <div className={styles.tableScroll}>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th className={styles.indexCell}>Row</th>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Tags</th>
                      <th>Group</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseResults.map((result) => (
                      <tr
                        key={result.row}
                        className={result.error ? styles.errorRow : undefined}
                      >
                        <td className={styles.indexCell}>{result.row}</td>
                        {result.expense ? (
                          <>
                            <td>{result.expense.date}</td>
                            <td>{result.expense.description}</td>
                            <td>${result.expense.amount.toFixed(2)}</td>
                            <td>{result.expense.tags.join(", ")}</td>
                            <td>{result.expense.group ?? ""}</td>
                            <td className={styles.okBadge}>OK</td>
                          </>
                        ) : (
                          <td colSpan={6} className={styles.errorText}>
                            {result.error}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className={styles.section}>
          <span className={styles.sectionTitle}>Saved Custom Formats</span>
          {definitions.length === 0 ? (
            <span className={styles.emptyText}>
              No custom formats defined yet.
            </span>
          ) : (
            definitions.map((def) => (
              <div key={def.id} className={styles.savedItem}>
                <div>
                  <div className={styles.savedItemName}>{def.name}</div>
                  <div className={styles.savedItemMeta}>
                    Date: col {def.dateColumn.index} ({def.dateColumn.format}) |
                    Desc: col {def.descriptionColumn.index} | Amount: col{" "}
                    {def.amountColumn.index}
                    {def.amountColumn.inverted ? " (inverted)" : ""}
                    {def.tagColumn ? ` | Tag: col ${def.tagColumn.index}` : ""}
                    {def.groupColumn ? ` | Group: col ${def.groupColumn.index}` : ""}
                    {def.creditDebitColumn
                      ? ` | C/D: col ${def.creditDebitColumn.index} ("${def.creditDebitColumn.creditQuery}")`
                      : ""}
                  </div>
                </div>
                <div className={styles.savedItemActions}>
                  <button
                    className={styles.btn}
                    onClick={() => handleEdit(def)}
                  >
                    Edit
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => removeDefinition(def.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </GenericPage>
  );
}