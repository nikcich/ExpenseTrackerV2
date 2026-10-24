import { useCallback, useMemo, useState } from "react";
import type { Grant, RsuVest } from "@/types/types";
import { formatShortDate, preventDoubleClick } from "@/utils/utils";
import { EntityTable } from "./EntityTable";
import styles from "./RSU.module.scss";

const emptyVest = (): Partial<RsuVest> => ({
  grantId: "",
  vestDate: "",
  shares: 0,
});

export function VestsSection({
  vests,
  grants,
  grantMap,
  onAdd,
  onUpdate,
  onRemove,
}: {
  vests: RsuVest[];
  grants: Grant[];
  grantMap: Map<string, Grant>;
  onAdd: (vest: RsuVest) => void;
  onUpdate: (id: string, vest: RsuVest) => void;
  onRemove: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<RsuVest>>(emptyVest());
  const [editingId, setEditingId] = useState<string | null>(null);

  const sortedVests = useMemo(
    () => [...vests].sort((a, b) => new Date(b.vestDate).getTime() - new Date(a.vestDate).getTime()),
    [vests]
  );

  const cancel = () => {
    setForm(emptyVest());
    setShowForm(false);
    setEditingId(null);
  };

  const save = useCallback(
    preventDoubleClick(() => {
      if (!form.grantId || !form.vestDate || !form.shares) return;
      const vest: RsuVest = {
        id: editingId ?? "",
        grantId: form.grantId,
        vestDate: form.vestDate,
        shares: Number(form.shares),
      };
      if (editingId) onUpdate(editingId, vest);
      else onAdd(vest);
      cancel();
    }),
    [form, editingId, onAdd, onUpdate]
  );

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>RSU Vests</span>
        <button
          className={styles.addBtn}
          onClick={() => {
            cancel();
            setShowForm(!showForm);
          }}
        >
          {showForm ? "Cancel" : "+ Add Vest"}
        </button>
      </div>

      <p className={styles.sectionNote}>
        Vesting means these shares became yours per the grant schedule — no money involved yet.
        Record the actual delivery and cost basis in Settlements below.
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
            <span className={styles.fieldLabel}>Vest Date</span>
            <input
              className={styles.fieldInput}
              type="date"
              value={form.vestDate ?? ""}
              onChange={(e) => setForm({ ...form, vestDate: e.target.value })}
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

      {sortedVests.length > 0 && (
        <EntityTable
          columns={[
            { header: "Grant", render: (v) => grantMap.get(v.grantId)?.name ?? "—" },
            { header: "Date", render: (v) => formatShortDate(v.vestDate) },
            { header: "Shares", align: "right", render: (v) => v.shares.toLocaleString() },
          ]}
          rows={sortedVests}
          onEdit={(v) => {
            setForm({ ...v });
            setEditingId(v.id);
            setShowForm(true);
          }}
          onDelete={(v) => onRemove(v.id)}
        />
      )}
    </div>
  );
}
