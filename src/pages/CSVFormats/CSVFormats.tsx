import { GenericPage } from "@/components/GenericPage/GenericPage";
import { Tooltip } from "@/components/ui/tooltip";
import { useCustomCsvDefinitions } from "@/store/store";
import type { DynamicCsvDefinition, PreviewResult } from "@/types/types";
import { API, type Response } from "@/types/types";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Spinner } from "@chakra-ui/react";
import { LuInfo } from "react-icons/lu";
import { useCallback, useMemo, useState } from "react";
import styles from "./CSVFormats.module.scss";

const emptyForm = (): Omit<DynamicCsvDefinition, "id"> => ({
  name: "",
  hasHeaders: true,
  dateColumn: { index: 0, format: "%m/%d/%Y" },
  descriptionColumn: { index: 1 },
  amountColumn: { index: 2, inverted: false },
  tagColumn: undefined,
  creditDebitColumn: undefined,
});

export function CSVFormats() {
  const { definitions, addDefinition, updateDefinition, removeDefinition } =
    useCustomCsvDefinitions();

  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [parseResults, setParseResults] = useState<PreviewResult[]>([]);
  const [parseLoading, setParseLoading] = useState(false);
  const [parsedSnapshot, setParsedSnapshot] = useState<{ form: string; path: string | null } | null>(null);

  const isStale = useMemo(() => {
    if (!parsedSnapshot || parseResults.length === 0) return false;
    return parsedSnapshot.form !== JSON.stringify(form) || parsedSnapshot.path !== previewPath;
  }, [parsedSnapshot, parseResults.length, form, previewPath]);

  const handlePreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const path = await open({
        multiple: false,
        directory: false,
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });
      if (!path) {
        setPreviewLoading(false);
        return;
      }
      setPreviewPath(path);
      const res = await invoke<Response<string[][]>>(API.ReadCSVPreview, {
        path,
        rows: 10,
      });
      setPreviewData(res.message ?? []);
    } catch {
      setPreviewData([]);
      setPreviewPath(null);
    }
    setPreviewLoading(false);
  }, []);

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
      const res = await invoke<Response<PreviewResult[]>>(API.PreviewParseCSV, {
        path: previewPath,
        definitionJson: defJson,
      });
      setParseResults(res.message ?? []);
      setParsedSnapshot({ form: JSON.stringify(form), path: previewPath });
    } catch {
      setParseResults([]);
    }
    setParseLoading(false);
  }, [previewPath, form]);

  const maxCols =
    previewData.length > 0
      ? Math.max(...previewData.map((r) => r.length))
      : 0;

  return (
    <GenericPage title="CSV Format Designer" hasRange={false} needsData={false}>
      <div className={styles.page}>
        {previewLoading && (
          <div className={styles.loadingOverlay}>
            <Spinner size="xl" color="var(--fg-info, #60a5fa)" />
            <span className={styles.loadingText}>Reading CSV...</span>
          </div>
        )}

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
                            <td className={styles.okBadge}>OK</td>
                          </>
                        ) : (
                          <td colSpan={5} className={styles.errorText}>
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
