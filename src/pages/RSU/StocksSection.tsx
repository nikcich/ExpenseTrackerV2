import { useCallback, useState } from "react";
import type { Stock } from "@/types/types";
import { preventDoubleClick } from "@/utils/utils";
import { grantsUsingStock, formatRsuMoney } from "./rsuPageUtils";
import { EntityTable } from "./EntityTable";
import styles from "./RSU.module.scss";
import type { Grant } from "@/types/types";

const emptyStock = (): Partial<Stock> => ({ ticker: "", currentPrice: 0 });

export function StocksSection({
  stocks,
  grants,
  onAdd,
  onUpdate,
  onRemove,
}: {
  stocks: Stock[];
  grants: Grant[];
  onAdd: (stock: Stock) => void;
  onUpdate: (id: string, stock: Stock) => void;
  onRemove: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Stock>>(emptyStock());
  const [editingId, setEditingId] = useState<string | null>(null);

  const cancel = () => {
    setForm(emptyStock());
    setShowForm(false);
    setEditingId(null);
  };

  const save = useCallback(
    preventDoubleClick(() => {
      if (!form.ticker || !form.currentPrice) return;
      const stock: Stock = {
        id: editingId ?? "",
        ticker: form.ticker,
        currentPrice: Number(form.currentPrice),
      };
      if (editingId) onUpdate(editingId, stock);
      else onAdd(stock);
      cancel();
    }),
    [form, editingId, onAdd, onUpdate]
  );

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Stocks</span>
        <button
          className={styles.addBtn}
          onClick={() => {
            cancel();
            setShowForm(!showForm);
          }}
        >
          {showForm ? "Cancel" : "+ Add Stock"}
        </button>
      </div>

      {showForm && (
        <div className={styles.inlineForm}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Ticker</span>
            <input
              className={styles.fieldInput}
              type="text"
              value={form.ticker ?? ""}
              onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
              placeholder="e.g. AAPL"
            />
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Current Price</span>
            <input
              className={styles.fieldInput}
              type="number"
              step="any"
              value={form.currentPrice ?? ""}
              onChange={(e) => setForm({ ...form, currentPrice: Number(e.target.value) })}
            />
          </div>
          <div className={styles.formActions}>
            <button className={styles.saveBtn} onClick={save}>
              Save
            </button>
            <button className={styles.cancelBtn} onClick={cancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {stocks.length > 0 && (
        <EntityTable
          columns={[
            { header: "Ticker", render: (s) => s.ticker },
            {
              header: "Current Price",
              align: "right",
              render: (s) => formatRsuMoney(s.currentPrice),
            },
          ]}
          rows={stocks}
          onEdit={(s) => {
            setForm({ ...s });
            setEditingId(s.id);
            setShowForm(true);
          }}
          onDelete={(s) => onRemove(s.id)}
          deleteDisabledReason={(s) => {
            const dependents = grantsUsingStock(s.id, grants);
            return dependents.length > 0
              ? `Delete ${dependents.length} dependent grant${dependents.length > 1 ? "s" : ""} first`
              : undefined;
          }}
        />
      )}
    </div>
  );
}
