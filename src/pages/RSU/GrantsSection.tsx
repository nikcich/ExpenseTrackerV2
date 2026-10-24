import { useCallback, useState } from "react";
import cx from "classnames";
import type { Grant, Stock, RsuVest, RsuSettlement, VestingFrequency } from "@/types/types";
import { preventDoubleClick } from "@/utils/utils";
import { vestsUsingGrant, settlementsUsingGrant, formatRsuMoney } from "./rsuPageUtils";
import { EntityTable } from "./EntityTable";
import styles from "./RSU.module.scss";

const emptyGrant = (): Partial<Grant> => ({
  name: "",
  stockId: "",
  grantPrice: 0,
  totalShares: 0,
  vestingSchedule: undefined,
});

const DISTRIBUTION_PRESETS: Record<string, (years: number) => number[]> = {
  equal: (years: number) => Array(years).fill(100 / years),
  front: (years: number) => {
    const weights = [50, 30, 15, 5];
    if (years <= weights.length) return weights.slice(0, years);
    const result = weights.map((w) => w);
    while (result.length < years) result.push(0);
    return result;
  },
  back: (years: number) => {
    const weights = [5, 15, 30, 50];
    if (years <= weights.length) return weights.slice(0, years);
    const result: number[] = [];
    while (result.length < years - weights.length) result.push(0);
    weights.forEach((w) => result.push(w));
    return result;
  },
};

const defaultScheduleForm = () => ({
  startDate: "",
  totalYears: 4,
  frequency: "quarterly" as VestingFrequency,
  distribution: [25, 25, 25, 25],
});

export function GrantsSection({
  grants,
  stocks,
  stockMap,
  vests,
  settlements,
  onAdd,
  onUpdate,
  onRemove,
}: {
  grants: Grant[];
  stocks: Stock[];
  stockMap: Map<string, Stock>;
  vests: RsuVest[];
  settlements: RsuSettlement[];
  onAdd: (grant: Grant) => void;
  onUpdate: (id: string, grant: Grant) => void;
  onRemove: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Grant>>(emptyGrant());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [schedulePreset, setSchedulePreset] = useState<string>("equal");
  const [scheduleForm, setScheduleForm] = useState(defaultScheduleForm());
  const [errors, setErrors] = useState<Set<string>>(new Set());

  const cancel = () => {
    setForm(emptyGrant());
    setShowForm(false);
    setEditingId(null);
    setSchedulePreset("equal");
    setScheduleForm(defaultScheduleForm());
    setErrors(new Set());
  };

  const save = useCallback(
    preventDoubleClick(() => {
      if (!form.name || !form.stockId || !form.totalShares) return;

      const nextErrors = new Set<string>();
      if (!scheduleForm.startDate) nextErrors.add("startDate");
      if (scheduleForm.totalYears <= 0) nextErrors.add("totalYears");
      const distSum = scheduleForm.distribution.reduce((a, b) => a + b, 0);
      if (Math.round(distSum * 100) / 100 !== 100) nextErrors.add("distribution");
      if (nextErrors.size > 0) {
        setErrors(nextErrors);
        return;
      }

      const grant: Grant = {
        id: editingId ?? "",
        name: form.name,
        stockId: form.stockId,
        grantPrice: Number(form.grantPrice ?? 0),
        totalShares: Number(form.totalShares),
        vestingSchedule: {
          startDate: scheduleForm.startDate,
          totalYears: scheduleForm.totalYears,
          frequency: scheduleForm.frequency,
          distribution: scheduleForm.distribution,
        },
      };
      if (editingId) onUpdate(editingId, grant);
      else onAdd(grant);
      cancel();
    }),
    [form, scheduleForm, editingId, onAdd, onUpdate]
  );

  const startEdit = (grant: Grant) => {
    setForm({ ...grant });
    setEditingId(grant.id);
    if (grant.vestingSchedule) {
      setSchedulePreset("custom");
      setScheduleForm({
        startDate: grant.vestingSchedule.startDate,
        totalYears: grant.vestingSchedule.totalYears,
        frequency: grant.vestingSchedule.frequency,
        distribution: [...grant.vestingSchedule.distribution],
      });
    } else {
      setSchedulePreset("equal");
      setScheduleForm(defaultScheduleForm());
    }
    setShowForm(true);
  };

  const distributionSum =
    Math.round(scheduleForm.distribution.reduce((a, b) => a + b, 0) * 100) / 100;

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Grants</span>
        <button
          className={styles.addBtn}
          onClick={() => {
            cancel();
            setShowForm(!showForm);
          }}
        >
          {showForm ? "Cancel" : "+ Add Grant"}
        </button>
      </div>

      {showForm && (
        <div className={styles.inlineForm}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Name</span>
            <input
              className={styles.fieldInput}
              type="text"
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Q1 2024 RSU Grant"
            />
          </div>
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
            <span className={styles.fieldLabel}>Grant Price</span>
            <input
              className={styles.fieldInput}
              type="number"
              step="any"
              value={form.grantPrice ?? ""}
              onChange={(e) => setForm({ ...form, grantPrice: Number(e.target.value) })}
            />
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Total Shares</span>
            <input
              className={styles.fieldInput}
              type="number"
              step="1"
              value={form.totalShares ?? ""}
              onChange={(e) => setForm({ ...form, totalShares: Number(e.target.value) })}
            />
          </div>

          <div className={styles.formRowBreak} />

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Start Date</span>
            <input
              className={cx(styles.fieldInput, errors.has("startDate") && styles.fieldError)}
              type="date"
              value={scheduleForm.startDate}
              onChange={(e) => {
                setScheduleForm({ ...scheduleForm, startDate: e.target.value });
                if (e.target.value) {
                  setErrors((prev) => {
                    const next = new Set(prev);
                    next.delete("startDate");
                    return next;
                  });
                }
              }}
            />
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Total Years</span>
            <input
              className={styles.fieldInput}
              type="number"
              min={1}
              max={10}
              step={1}
              value={scheduleForm.totalYears}
              onChange={(e) => {
                const years = Math.max(1, Math.min(10, Number(e.target.value)));
                const fn = DISTRIBUTION_PRESETS[schedulePreset] ?? DISTRIBUTION_PRESETS.equal;
                setScheduleForm({
                  ...scheduleForm,
                  totalYears: years,
                  distribution: fn(years),
                });
              }}
            />
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Frequency</span>
            <select
              className={styles.fieldInput}
              value={scheduleForm.frequency}
              onChange={(e) =>
                setScheduleForm({ ...scheduleForm, frequency: e.target.value as VestingFrequency })
              }
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="semi-annual">Semi-Annual</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Distribution</span>
            <select
              className={styles.fieldInput}
              value={schedulePreset}
              onChange={(e) => {
                const preset = e.target.value;
                setSchedulePreset(preset);
                if (preset !== "custom") {
                  const fn = DISTRIBUTION_PRESETS[preset];
                  setScheduleForm({
                    ...scheduleForm,
                    distribution: fn(scheduleForm.totalYears),
                  });
                }
              }}
            >
              <option value="equal">Equal</option>
              <option value="front">Front-loaded</option>
              <option value="back">Back-loaded</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {schedulePreset === "custom" && (
            <div className={styles.distributionInputs}>
              {scheduleForm.distribution.map((pct, idx) => (
                <div key={idx} className={styles.distributionField}>
                  <span className={styles.fieldLabel}>Year {idx + 1} %</span>
                  <input
                    className={styles.fieldInput}
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={pct}
                    onChange={(e) => {
                      const newDist = [...scheduleForm.distribution];
                      newDist[idx] = Number(e.target.value);
                      setScheduleForm({ ...scheduleForm, distribution: newDist });
                      const sum = newDist.reduce((a, b) => a + b, 0);
                      if (Math.round(sum * 100) / 100 === 100) {
                        setErrors((prev) => {
                          const next = new Set(prev);
                          next.delete("distribution");
                          return next;
                        });
                      }
                    }}
                  />
                </div>
              ))}
              <span
                className={cx(
                  styles.distributionTotal,
                  distributionSum === 100 ? styles.distValid : styles.distInvalid,
                  errors.has("distribution") && styles.distError
                )}
              >
                {scheduleForm.distribution.reduce((a, b) => a + b, 0).toFixed(0)}% / 100%
              </span>
            </div>
          )}

          {schedulePreset !== "custom" && (
            <div className={styles.distributionPreview}>
              {scheduleForm.distribution.map((pct, idx) => (
                <span key={idx} className={styles.distChip}>
                  Y{idx + 1}: {pct.toFixed(1)}%
                </span>
              ))}
            </div>
          )}

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

      {grants.length > 0 && (
        <EntityTable
          columns={[
            { header: "Name", render: (g) => g.name },
            { header: "Stock", render: (g) => stockMap.get(g.stockId)?.ticker ?? "—" },
            {
              header: "Grant Price",
              align: "right",
              render: (g) => formatRsuMoney(g.grantPrice),
            },
            {
              header: "Total Shares",
              align: "right",
              render: (g) => {
                const vestedShares = vestsUsingGrant(g.id, vests).reduce(
                  (s, v) => s + v.shares,
                  0
                );
                return `${vestedShares.toLocaleString()} / ${g.totalShares.toLocaleString()}`;
              },
            },
          ]}
          rows={grants}
          onEdit={startEdit}
          onDelete={(g) => onRemove(g.id)}
          deleteDisabledReason={(g) => {
            const dependentVests = vestsUsingGrant(g.id, vests);
            const dependentSettlements = settlementsUsingGrant(g.id, settlements);
            const total = dependentVests.length + dependentSettlements.length;
            if (total === 0) return undefined;
            const parts: string[] = [];
            if (dependentVests.length > 0) {
              parts.push(`${dependentVests.length} vest${dependentVests.length > 1 ? "s" : ""}`);
            }
            if (dependentSettlements.length > 0) {
              parts.push(
                `${dependentSettlements.length} settlement${dependentSettlements.length > 1 ? "s" : ""}`
              );
            }
            return `Delete ${parts.join(" and ")} first`;
          }}
        />
      )}
    </div>
  );
}
