import { useCallback, useMemo, useState } from "react";
import type { Grant, RsuSettlement } from "@/types/types";
import { formatShortDate, preventDoubleClick } from "@/utils/utils";
import { settlementNetShares } from "@/utils/rsu-forecast";
import { EntityTable } from "./EntityTable";
import { formatRsuMoney } from "./rsuPageUtils";
import styles from "./RSU.module.scss";

const emptySettlement = (): Partial<RsuSettlement> => ({
  grantId: "",
  date: "",
  shares: 0,
  basisPrice: 0,
  sharesWithheld: 0,
});

export function SettlementsSection({
  settlements,
  grants,
  grantMap,
  onAdd,
  onUpdate,
  onRemove,
}: {
  settlements: RsuSettlement[];
  grants: Grant[];
  grantMap: Map<string, Grant>;
  onAdd: (settlement: RsuSettlement) => void;
  onUpdate: (id: string, settlement: RsuSettlement) => void;
  onRemove: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<RsuSettlement>>(emptySettlement());
  const [editingId, setEditingId] = useState<string | null>(null);

  const sortedSettlements = useMemo(
    () => [...settlements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [settlements]
  );

  const cancel = () => {
    setForm(emptySettlement());
    setShowForm(false);
    setEditingId(null);
  };

  const save = useCallback(
    preventDoubleClick(() => {
      if (!form.grantId || !form.date || !form.shares || !form.basisPrice) return;
      const settlement: RsuSettlement = {
        id: editingId ?? "",
        grantId: form.grantId,
        date: form.date,
        shares: Number(form.shares),
        basisPrice: Number(form.basisPrice),
        sharesWithheld: Number(form.sharesWithheld ?? 0),
      };
      if (editingId) onUpdate(editingId, settlement);
      else onAdd(settlement);
      cancel();
    }),
    [form, editingId, onAdd, onUpdate]
  );

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Settlements</span>
        <button
          className={styles.addBtn}
          onClick={() => {
            cancel();
            setShowForm(!showForm);
          }}
        >
          {showForm ? "Cancel" : "+ Add Settlement"}
        </button>
      </div>

      <p className={styles.sectionNote}>
        Settlement is when shares are actually delivered — cost basis and any tax withholding are
        set here, independent of the vest date/schedule above.
      </p>

      {showForm && (
        <div className={styles.inlineForm}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Grant</span>
            <select
              className={styles.fieldInput}
              value={form.grantId ?? ""}
              onChange={(e) => setForm({ ...form, grantId: e.target.value })}
            >
              <option value="">Select grant...</option>
              {grants.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Settlement Date</span>
            <input
              className={styles.fieldInput}
              type="date"
              value={form.date ?? ""}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Shares Settled</span>
            <input
              className={styles.fieldInput}
              type="number"
              step="any"
              value={form.shares ?? ""}
              onChange={(e) => setForm({ ...form, shares: Number(e.target.value) })}
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
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Shares Withheld (tax)</span>
            <input
              className={styles.fieldInput}
              type="number"
              step="any"
              value={form.sharesWithheld ?? 0}
              onChange={(e) => setForm({ ...form, sharesWithheld: Number(e.target.value) })}
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

      {sortedSettlements.length > 0 && (
        <EntityTable
          columns={[
            { header: "Grant", render: (s) => grantMap.get(s.grantId)?.name ?? "—" },
            { header: "Date", render: (s) => formatShortDate(s.date) },
            { header: "Shares", align: "right", render: (s) => s.shares.toLocaleString() },
            {
              header: "Withheld",
              align: "right",
              render: (s) => (s.sharesWithheld ?? 0).toLocaleString(),
            },
            {
              header: "Net Shares",
              align: "right",
              render: (s) => settlementNetShares(s).toLocaleString(),
            },
            {
              header: "Basis Price",
              align: "right",
              render: (s) => formatRsuMoney(s.basisPrice),
            },
            {
              header: "Net Value",
              align: "right",
              render: (s) => formatRsuMoney(settlementNetShares(s) * s.basisPrice),
            },
          ]}
          rows={sortedSettlements}
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
