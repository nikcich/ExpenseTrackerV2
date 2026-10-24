import { useMemo, useRef, useState } from "react";
import {
  useRsuSettlements,
  useBalanceSnapshots,
  useStocks,
  useGrants,
} from "@/store/store";
import type { BalanceSnapshot } from "@/types/types";
import { formatCurrency, formatDate, SHORTCUT_COOLDOWN } from "@/utils/utils";
import { computeRsuPortfolioValue } from "@/utils/rsu-forecast";
import { Sparkline } from "@/components/Sparkline/Sparkline";
import {
  latestByAccount,
  groupByAccountSorted,
  computeAccountDelta,
  computeBalanceTimeSeries,
  computeNetWorthTimeSeries,
} from "./accountsPageUtils";
import styles from "./Accounts.module.scss";

const emptySnapshot = (): Partial<BalanceSnapshot> => ({
  accountName: "",
  date: "",
  balance: 0,
  notes: "",
  type: "asset",
});

export function Accounts() {
  const { settlements } = useRsuSettlements();
  const { snapshots, addSnapshot, updateSnapshot, removeSnapshot } =
    useBalanceSnapshots();
  const { stocks } = useStocks();
  const { grants } = useGrants();

  const [showSnapshotForm, setShowSnapshotForm] = useState(false);
  const [snapshotForm, setSnapshotForm] =
    useState<Partial<BalanceSnapshot>>(emptySnapshot());
  const [editingSnapshot, setEditingSnapshot] = useState<string | null>(null);
  const saveSnapshotGuard = useRef(false);

  const sortedSnapshots = useMemo(
    () =>
      [...snapshots].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [snapshots]
  );

  const assets = useMemo(
    () => snapshots.filter((s) => (s.type ?? "asset") !== "debt"),
    [snapshots]
  );
  const debts = useMemo(() => snapshots.filter((s) => s.type === "debt"), [snapshots]);

  const stockMap = useMemo(() => new Map(stocks.map((s) => [s.id, s])), [stocks]);
  const grantMap = useMemo(() => new Map(grants.map((g) => [g.id, g])), [grants]);

  const totalRsuValue = useMemo(
    () => computeRsuPortfolioValue(settlements, grantMap, stockMap),
    [settlements, grantMap, stockMap]
  );

  const latestAssets = useMemo(() => latestByAccount(assets), [assets]);
  const latestDebts = useMemo(() => latestByAccount(debts), [debts]);

  const totalAssets = useMemo(
    () => [...latestAssets.values()].reduce((s, a) => s + a.balance, 0) + totalRsuValue,
    [latestAssets, totalRsuValue]
  );
  const totalDebts = useMemo(
    () => [...latestDebts.values()].reduce((s, d) => s + Math.abs(d.balance), 0),
    [latestDebts]
  );

  const assetHistories = useMemo(() => groupByAccountSorted(assets), [assets]);
  const activeDebts = useMemo(
    () => groupByAccountSorted(debts).filter(({ snapshots }) => snapshots[0]?.balance !== 0),
    [debts]
  );

  const netWorthSeries = useMemo(
    () => computeNetWorthTimeSeries(snapshots, debts),
    [snapshots, debts]
  );
  const portfolioSeries = useMemo(() => computeBalanceTimeSeries(assets, false), [assets]);

  const handleSaveSnapshot = () => {
    if (saveSnapshotGuard.current) return;
    if (
      !snapshotForm.accountName ||
      !snapshotForm.date ||
      snapshotForm.balance === undefined ||
      snapshotForm.balance === null
    )
      return;
    saveSnapshotGuard.current = true;
    const snapshot: BalanceSnapshot = {
      id: editingSnapshot ?? "",
      accountName: snapshotForm.accountName,
      date: snapshotForm.date,
      balance: Number(snapshotForm.balance),
      notes: snapshotForm.notes ?? "",
      type: snapshotForm.type ?? "asset",
    };
    if (editingSnapshot) {
      updateSnapshot(editingSnapshot, snapshot);
    } else {
      addSnapshot(snapshot);
    }
    setSnapshotForm(emptySnapshot());
    setShowSnapshotForm(false);
    setEditingSnapshot(null);
    setTimeout(() => {
      saveSnapshotGuard.current = false;
    }, SHORTCUT_COOLDOWN);
  };

  const handleEditSnapshot = (snapshot: BalanceSnapshot) => {
    setSnapshotForm({ ...snapshot });
    setEditingSnapshot(snapshot.id);
    setShowSnapshotForm(true);
  };

  const handleCancelSnapshot = () => {
    setSnapshotForm(emptySnapshot());
    setShowSnapshotForm(false);
    setEditingSnapshot(null);
  };

  return (
    <div className={styles.page}>
      <div className={styles.netWorthRow}>
        <div className={styles.netWorthCard}>
          <span className={styles.summaryCardTitle}>Net Worth</span>
          <span
            className={`${styles.netWorthValue} ${totalAssets - totalDebts >= 0 ? styles.money : styles.debtColor}`}
          >
            {formatCurrency(totalAssets - totalDebts)}
          </span>
          <span className={styles.netWorthBreakdown}>
            {totalRsuValue > 0 && (
              <>
                <span className={styles.money}>
                  {formatCurrency(totalRsuValue)}
                </span>
                {" RSU"}
              </>
            )}
            {totalRsuValue > 0 && totalAssets - totalRsuValue > 0 && (
              <span className={styles.money}>{" + "}</span>
            )}
            {totalAssets - totalRsuValue > 0 && (
              <>
                <span className={styles.money}>
                  {formatCurrency(totalAssets - totalRsuValue)}
                </span>
                {" accounts"}
              </>
            )}
            {(totalRsuValue > 0 || totalAssets - totalRsuValue > 0) &&
              totalDebts > 0 && (
                <span className={styles.debtColor}>{" – "}</span>
              )}
            {totalDebts > 0 && (
              <>
                <span className={styles.debtColor}>
                  {formatCurrency(totalDebts)}
                </span>
                {" debts"}
              </>
            )}
          </span>
        </div>
      </div>

      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryCardTitle}>Assets</span>
          {assets.length === 0 ? (
            <span className={styles.summaryEmpty}>No data</span>
          ) : (
            <div className={styles.summaryBalances}>
              {assetHistories.map(({ name, snapshots: accountSnapshots }) => {
                const latest = accountSnapshots[0];
                const prev = accountSnapshots[1];
                const delta = computeAccountDelta(latest, prev);
                return (
                  <div key={name} className={styles.summaryStat}>
                    <span className={styles.summaryStatLabel}>{name}</span>
                    <span
                      className={`${styles.summaryStatValue} ${styles.money}`}
                    >
                      {formatCurrency(latest.balance)}
                    </span>
                    <span className={styles.balanceMeta}>
                      {delta && (
                        <span
                          className={
                            delta.isUp ? styles.deltaUp : styles.deltaDown
                          }
                        >
                          <span className={styles.deltaArrow}>
                            {delta.isUp ? "↑" : "↓"}
                          </span>
                          {Math.round(Math.abs(delta.pct))}%
                        </span>
                      )}
                      <span className={styles.summaryBalanceDate}>
                        {formatDate(latest.date)}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {activeDebts.length > 0 && (
          <div className={styles.summaryCard}>
            <span className={styles.summaryCardTitle}>Debts</span>
            <div className={styles.summaryBalances}>
              {activeDebts.map(({ name, snapshots: accountSnapshots }) => {
                const latest = accountSnapshots[0];
                const prev = accountSnapshots[1];
                const delta = computeAccountDelta(latest, prev);
                return (
                  <div key={name} className={styles.summaryStat}>
                    <span className={styles.summaryStatLabel}>{name}</span>
                    <span
                      className={`${styles.summaryStatValue} ${styles.debtColor}`}
                    >
                      {formatCurrency(Math.abs(latest.balance))}
                    </span>
                    <span className={styles.balanceMeta}>
                      {delta && (
                        <span
                          className={
                            delta.isUp ? styles.deltaDown : styles.deltaUp
                          }
                        >
                          <span className={styles.deltaArrow}>
                            {delta.isUp ? "↑" : "↓"}
                          </span>
                          {Math.round(Math.abs(delta.pct))}%
                        </span>
                      )}
                      <span className={styles.summaryBalanceDate}>
                        {formatDate(latest.date)}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className={styles.sparklineRow}>
        <div className={styles.sparklineCard}>
          <span className={styles.sparklineTitle}>Net Worth</span>
          {snapshots.length < 2 ? (
            <span className={styles.summaryEmpty}>
              Need at least 2 snapshots
            </span>
          ) : (
            <Sparkline
              data={netWorthSeries}
              color="var(--fg-success)"
              showLabels="auto"
            />
          )}
        </div>
        <div className={styles.sparklineCard}>
          <span className={styles.sparklineTitle}>Total Portfolio Balance</span>
          {snapshots.length < 2 ? (
            <span className={styles.summaryEmpty}>
              Need at least 2 snapshots
            </span>
          ) : (
            <Sparkline
              data={portfolioSeries}
              color="var(--fg-info)"
              showLabels="auto"
            />
          )}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Balance Snapshots</span>
          <button
            className={styles.addBtn}
            onClick={() => {
              handleCancelSnapshot();
              setShowSnapshotForm(!showSnapshotForm);
            }}
          >
            {showSnapshotForm ? "Cancel" : "+ Add Snapshot"}
          </button>
        </div>

        {showSnapshotForm && (
          <div className={styles.inlineForm}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Account</span>
              <input
                className={styles.fieldInput}
                type="text"
                value={snapshotForm.accountName ?? ""}
                onChange={(e) =>
                  setSnapshotForm({
                    ...snapshotForm,
                    accountName: e.target.value,
                  })
                }
                placeholder="e.g. 401k - Fidelity"
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Date</span>
              <input
                className={styles.fieldInput}
                type="date"
                value={snapshotForm.date ?? ""}
                onChange={(e) =>
                  setSnapshotForm({ ...snapshotForm, date: e.target.value })
                }
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Balance</span>
              <input
                className={styles.fieldInput}
                type="number"
                step="any"
                value={snapshotForm.balance ?? ""}
                onChange={(e) =>
                  setSnapshotForm({
                    ...snapshotForm,
                    balance: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Notes</span>
              <input
                className={styles.fieldInput}
                type="text"
                value={snapshotForm.notes ?? ""}
                onChange={(e) =>
                  setSnapshotForm({ ...snapshotForm, notes: e.target.value })
                }
                placeholder="optional"
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Type</span>
              <select
                className={styles.fieldInput}
                value={snapshotForm.type ?? "asset"}
                onChange={(e) =>
                  setSnapshotForm({
                    ...snapshotForm,
                    type: e.target.value as "asset" | "debt",
                  })
                }
              >
                <option value="asset">Asset</option>
                <option value="debt">Debt</option>
              </select>
            </div>
            <div className={styles.formActions}>
              <button className={styles.saveBtn} onClick={handleSaveSnapshot}>
                Save
              </button>
              <button
                className={styles.cancelBtn}
                onClick={handleCancelSnapshot}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {sortedSnapshots.length > 0 && (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Date</th>
                  <th className={styles.num}>Balance</th>
                  <th>Notes</th>
                  <th>Type</th>
                  <th className={styles.actionsCell}></th>
                </tr>
              </thead>
              <tbody>
                {sortedSnapshots.map((s) => (
                  <tr key={s.id}>
                    <td>{s.accountName}</td>
                    <td>{formatDate(s.date)}</td>
                    <td
                      className={`${styles.num} ${s.balance >= 0 ? styles.money : styles.debtMoney}`}
                    >
                      {formatCurrency(s.balance)}
                    </td>
                    <td>{s.notes ?? ""}</td>
                    <td>
                      <span
                        className={
                          s.type === "debt" ? styles.typeDebt : styles.typeAsset
                        }
                      >
                        {(s.type ?? "asset").toUpperCase()}
                      </span>
                    </td>
                    <td className={styles.actionsCell}>
                      <button
                        className={styles.actionBtn}
                        onClick={() => handleEditSnapshot(s)}
                      >
                        Edit
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() => removeSnapshot(s.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
