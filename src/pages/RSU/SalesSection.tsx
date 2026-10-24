import { useCallback, useMemo, useState } from "react";
import cx from "classnames";
import type { Sale, Stock } from "@/types/types";
import { formatShortDate, preventDoubleClick } from "@/utils/utils";
import { EntityTable } from "./EntityTable";
import { formatRsuMoney } from "./rsuPageUtils";
import styles from "./RSU.module.scss";

const emptySale = (): Partial<Sale> => ({
  stockId: "",
  date: "",
  shares: 0,
  salePrice: 0,
  basisPrice: 0,
});

export function SalesSection({
  sales,
  stocks,
  stockMap,
  onAdd,
  onUpdate,
  onRemove,
}: {
  sales: Sale[];
  stocks: Stock[];
  stockMap: Map<string, Stock>;
  onAdd: (sale: Sale) => void;
  onUpdate: (id: string, sale: Sale) => void;
  onRemove: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Sale>>(emptySale());
  const [editingId, setEditingId] = useState<string | null>(null);

  const sortedSales = useMemo(
    () => [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [sales]
  );

  const cancel = () => {
    setForm(emptySale());
    setShowForm(false);
    setEditingId(null);
  };

  const save = useCallback(
    preventDoubleClick(() => {
      if (!form.stockId || !form.date || !form.shares || !form.salePrice || !form.basisPrice) return;
      const sale: Sale = {
        id: editingId ?? "",
        stockId: form.stockId,
        date: form.date,
        shares: Number(form.shares),
        salePrice: Number(form.salePrice),
        basisPrice: Number(form.basisPrice),
      };
      if (editingId) onUpdate(editingId, sale);
      else onAdd(sale);
      cancel();
    }),
    [form, editingId, onAdd, onUpdate]
  );

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Sales</span>
        <button
          className={styles.addBtn}
          onClick={() => {
            cancel();
            setShowForm(!showForm);
          }}
        >
          {showForm ? "Cancel" : "+ Add Sale"}
        </button>
      </div>

      {showForm && (
        <div className={styles.inlineForm}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Stock</span>
            <select
              className={styles.fieldInput}
              value={form.stockId ?? ""}
              onChange={(e) => setForm({ ...form, stockId: e.target.value })}
            >
              <option value="">Select stock...</option>
              {stocks.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.ticker}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Date</span>
            <input
              className={styles.fieldInput}
              type="date"
              value={form.date ?? ""}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Shares</span>
            <input
              className={styles.fieldInput}
              type="number"
              step="any"
              value={form.shares ?? ""}
              onChange={(e) => setForm({ ...form, shares: Number(e.target.value) })}
            />
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Sale Price</span>
            <input
              className={styles.fieldInput}
              type="number"
              step="any"
              value={form.salePrice ?? ""}
              onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })}
            />
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Basis Price</span>
            <input
              className={styles.fieldInput}
              type="number"
              step="any"
              value={form.basisPrice ?? ""}
              onChange={(e) => setForm({ ...form, basisPrice: Number(e.target.value) })}
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

      {sortedSales.length > 0 && (
        <EntityTable
          columns={[
            { header: "Stock", render: (s) => stockMap.get(s.stockId)?.ticker ?? "—" },
            { header: "Date", render: (s) => formatShortDate(s.date) },
            { header: "Shares", render: (s) => s.shares.toLocaleString() },
            {
              header: "Sale Price",
              align: "right",
              render: (s) => formatRsuMoney(s.salePrice),
            },
            {
              header: "Basis Price",
              align: "right",
              render: (s) => formatRsuMoney(s.basisPrice),
            },
            {
              header: "Proceeds",
              align: "right",
              render: (s) => {
                const proceeds = (s.salePrice - s.basisPrice) * s.shares;
                return (
                  <span className={cx(proceeds >= 0 ? styles.money : styles.debtColor)}>
                    {proceeds >= 0 ? "+" : ""}
                    {formatRsuMoney(proceeds)}
                  </span>
                );
              },
            },
          ]}
          rows={sortedSales}
          onEdit={(s) => {
            setForm({ ...s });
            setEditingId(s.id);
            setShowForm(true);
          }}
          onDelete={(s) => onRemove(s.id)}
        />
      )}
    </div>
  );
}
