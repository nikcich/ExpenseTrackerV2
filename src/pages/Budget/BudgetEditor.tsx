import { useState } from "react";
import type { BudgetKind, BudgetLine } from "@/types/types";
import { ConfirmDeleteButton } from "@/pages/RSU/ConfirmDeleteButton";
import styles from "./Budget.module.scss";

export function BudgetEditor({
  budgets,
  tagOptions,
  groupOptions,
  onAdd,
  onUpdate,
  onRemove,
}: {
  budgets: BudgetLine[];
  tagOptions: string[];
  groupOptions: string[];
  onAdd: (budget: Omit<BudgetLine, "id">) => void;
  onUpdate: (id: string, budget: BudgetLine) => void;
  onRemove: (id: string) => void;
}) {
  const [kind, setKind] = useState<BudgetKind>("group");
  const [name, setName] = useState("");
  const [monthly, setMonthly] = useState("");

  const options = kind === "tag" ? tagOptions : groupOptions;
  const amount = Number(monthly);
  const canAdd = name.trim() !== "" && monthly !== "" && !isNaN(amount) && amount >= 0;

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd({ kind, name: name.trim(), monthly: amount });
    setName("");
    setMonthly("");
  };

  return (
    <div className={styles.tableCard}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>Monthly budgets</span>
      </div>
      <div className={styles.editorBody}>
        {budgets.map((b) => (
          <div key={b.id} className={styles.ruleRow}>
            <div className={styles.field} style={{ flex: "0.5", minWidth: "90px" }}>
              <span className={styles.fieldLabel}>Type</span>
              <span className={styles.kindText}>{b.kind === "tag" ? "Tag (line item)" : "Group"}</span>
            </div>
            <div className={styles.field} style={{ flex: "1.5" }}>
              <span className={styles.fieldLabel}>Name</span>
              <span className={styles.kindText}>{b.name}</span>
            </div>
            <div className={styles.field} style={{ flex: "0.8", minWidth: "110px" }}>
              <span className={styles.fieldLabel}>Per month</span>
              <input
                className={styles.fieldInput}
                type="text"
                inputMode="decimal"
                value={b.monthly}
                onChange={(e) => {
                  const num = Number(e.target.value);
                  if (!isNaN(num) && num >= 0) onUpdate(b.id, { ...b, monthly: num });
                }}
              />
            </div>
            <ConfirmDeleteButton onConfirm={() => onRemove(b.id)} />
          </div>
        ))}
        <div className={styles.ruleRow}>
          <div className={styles.field} style={{ flex: "0.5", minWidth: "90px" }}>
            <span className={styles.fieldLabel}>Type</span>
            <select
              className={styles.fieldInput}
              value={kind}
              onChange={(e) => {
                setKind(e.currentTarget.value as BudgetKind);
                setName("");
              }}
            >
              <option value="group">Group</option>
              <option value="tag">Tag (line item)</option>
            </select>
          </div>
          <div className={styles.field} style={{ flex: "1.5" }}>
            <span className={styles.fieldLabel}>Name</span>
            <input
              className={styles.fieldInput}
              type="text"
              list="budget-name-options"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={kind === "tag" ? "e.g. Food" : "e.g. Essentials"}
            />
            <datalist id="budget-name-options">
              {options.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </div>
          <div className={styles.field} style={{ flex: "0.8", minWidth: "110px" }}>
            <span className={styles.fieldLabel}>Per month</span>
            <input
              className={styles.fieldInput}
              type="text"
              inputMode="decimal"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="0"
            />
          </div>
          <button className={styles.addBtn} onClick={handleAdd} disabled={!canAdd}>
            + Add
          </button>
        </div>
      </div>
    </div>
  );
}
