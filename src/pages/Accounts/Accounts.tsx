import { useEffect, useRef, useState } from "react";
import { useRsuVests, useBalanceSnapshots } from "@/store/store";
import type { RsuVest, BalanceSnapshot } from "@/types/types";
import { formatCurrency, formatDate, formatShortDate, SHORTCUT_COOLDOWN } from "@/utils/utils";
import styles from "./Accounts.module.scss";

const emptyRsu = (): Partial<RsuVest> => ({ vestDate: "", shares: 0, price: 0, description: "" });
const emptySnapshot = (): Partial<BalanceSnapshot> => ({ accountName: "", date: "", balance: 0, notes: "", type: "asset" });

export function Accounts() {
  const { vests, addVest, updateVest, removeVest } = useRsuVests();
  const { snapshots, addSnapshot, updateSnapshot, removeSnapshot } = useBalanceSnapshots();

  const [showRsuForm, setShowRsuForm] = useState(false);
  const [rsuForm, setRsuForm] = useState<Partial<RsuVest>>(emptyRsu());
  const [editingRsu, setEditingRsu] = useState<string | null>(null);

  const [showSnapshotForm, setShowSnapshotForm] = useState(false);
  const [snapshotForm, setSnapshotForm] = useState<Partial<BalanceSnapshot>>(emptySnapshot());
  const [editingSnapshot, setEditingSnapshot] = useState<string | null>(null);
  const saveRsuGuard = useRef(false);
  const saveSnapshotGuard = useRef(false);

  const sortedVests = [...vests].sort((a, b) => new Date(b.vestDate).getTime() - new Date(a.vestDate).getTime());
  const sortedSnapshots = [...snapshots].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const assets = snapshots.filter((s) => (s.type ?? "asset") !== "debt");
  const debts = snapshots.filter((s) => s.type === "debt");
  const latestByAccount = (items: BalanceSnapshot[]): Map<string, BalanceSnapshot> => {
    const map = new Map<string, BalanceSnapshot>();
    for (const s of items) {
      const existing = map.get(s.accountName);
      if (!existing || new Date(s.date) > new Date(existing.date)) {
        map.set(s.accountName, s);
      }
    }
    return map;
  };
  const totalRsuValue = vests.reduce((s, v) => s + v.shares * v.price, 0);
  const totalAssets = [...latestByAccount(assets).values()].reduce((s, a) => s + a.balance, 0) + totalRsuValue;
  const totalDebts = [...latestByAccount(debts).values()].reduce((s, d) => s + Math.abs(d.balance), 0);
  const activeDebts = [...Array.from(new Set(debts.map((s) => s.accountName)))]
    .map((name) => {
      const accountSnapshots = debts
        .filter((s) => s.accountName === name)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return { name, snapshots: accountSnapshots };
    })
    .filter(({ snapshots }) => snapshots[0]?.balance !== 0);

  const handleSaveRsu = () => {
    if (saveRsuGuard.current) return;
    if (!rsuForm.vestDate || !rsuForm.shares || !rsuForm.price) return;
    saveRsuGuard.current = true;
    const vest: RsuVest = {
      id: editingRsu ?? "",
      vestDate: rsuForm.vestDate,
      shares: Number(rsuForm.shares),
      price: Number(rsuForm.price),
      description: rsuForm.description ?? "",
    };
    if (editingRsu) {
      updateVest(editingRsu, vest);
    } else {
      addVest(vest);
    }
    setRsuForm(emptyRsu());
    setShowRsuForm(false);
    setEditingRsu(null);
    setTimeout(() => { saveRsuGuard.current = false; }, SHORTCUT_COOLDOWN);
  };

  const handleEditRsu = (vest: RsuVest) => {
    setRsuForm({ ...vest });
    setEditingRsu(vest.id);
    setShowRsuForm(true);
  };

  const handleCancelRsu = () => {
    setRsuForm(emptyRsu());
    setShowRsuForm(false);
    setEditingRsu(null);
  };

  const handleSaveSnapshot = () => {
    if (saveSnapshotGuard.current) return;
    if (!snapshotForm.accountName || !snapshotForm.date || snapshotForm.balance === undefined || snapshotForm.balance === null) return;
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
    setTimeout(() => { saveSnapshotGuard.current = false; }, SHORTCUT_COOLDOWN);
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
          <span className={`${styles.netWorthValue} ${totalAssets - totalDebts >= 0 ? styles.money : styles.debtColor}`}>{formatCurrency(totalAssets - totalDebts)}</span>
          <span className={styles.netWorthBreakdown}>
            {totalRsuValue > 0 && (
              <><span className={styles.money}>{formatCurrency(totalRsuValue)}</span>{" RSU"}</>
            )}
            {totalRsuValue > 0 && totalAssets - totalRsuValue > 0 && <span className={styles.money}>{" + "}</span>}
            {totalAssets - totalRsuValue > 0 && (
              <><span className={styles.money}>{formatCurrency(totalAssets - totalRsuValue)}</span>{" accounts"}</>
            )}
            {(totalRsuValue > 0 || totalAssets - totalRsuValue > 0) && totalDebts > 0 && <span className={styles.debtColor}>{" – "}</span>}
            {totalDebts > 0 && (
              <><span className={styles.debtColor}>{formatCurrency(totalDebts)}</span>{" debts"}</>
            )}
          </span>
        </div>
      </div>

      <div className={styles.summaryRow}>
        {vests.length > 0 && (
          <div className={styles.summaryCard}>
            <span className={styles.summaryCardTitle}>RSU Summary</span>
            <div className={styles.summaryStats}>
              <div className={styles.summaryStat}>
                <span className={styles.summaryStatLabel}>Total Shares</span>
                <span className={styles.summaryStatValue}>{vests.reduce((s, v) => s + v.shares, 0).toLocaleString()}</span>
              </div>
              <div className={styles.summaryStat}>
                <span className={styles.summaryStatLabel}>Value at Vest</span>
                <span className={`${styles.summaryStatValue} ${styles.money}`}>
                  {formatCurrency(vests.reduce((s, v) => s + v.shares * v.price, 0))}
                </span>
              </div>
              <div className={styles.summaryStat}>
                <span className={styles.summaryStatLabel}>Events</span>
                <span className={styles.summaryStatValue}>{vests.length}</span>
              </div>
            </div>
          </div>
        )}
        <div className={styles.summaryCard}>
          <span className={styles.summaryCardTitle}>Assets</span>
          {assets.length === 0 ? (
            <span className={styles.summaryEmpty}>No data</span>
          ) : (
            <div className={styles.summaryBalances}>
              {[...Array.from(new Set(assets.map((s) => s.accountName)))].map((name) => {
                const accountSnapshots = assets
                  .filter((s) => s.accountName === name)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const latest = accountSnapshots[0];
                const prev = accountSnapshots[1];
                let delta: { isUp: boolean; pct: number } | null = null;
                if (prev && prev.balance !== 0) {
                  const pct = ((latest.balance - prev.balance) / Math.abs(prev.balance)) * 100;
                  delta = { isUp: latest.balance > prev.balance, pct };
                }
                return (
                  <div key={name} className={styles.summaryStat}>
                    <span className={styles.summaryStatLabel}>{name}</span>
                    <span className={`${styles.summaryStatValue} ${styles.money}`}>
                      {formatCurrency(latest.balance)}
                    </span>
                    <span className={styles.balanceMeta}>
                      {delta && (
                        <span className={delta.isUp ? styles.deltaUp : styles.deltaDown}>
                          <span className={styles.deltaArrow}>{delta.isUp ? "↑" : "↓"}</span>
                          {Math.round(Math.abs(delta.pct))}%
                        </span>
                      )}
                      <span className={styles.summaryBalanceDate}>{formatDate(latest.date)}</span>
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
              let delta: { isUp: boolean; pct: number } | null = null;
              if (prev && prev.balance !== 0) {
                const pct = ((latest.balance - prev.balance) / Math.abs(prev.balance)) * 100;
                delta = { isUp: latest.balance > prev.balance, pct };
              }
              return (
                <div key={name} className={styles.summaryStat}>
                  <span className={styles.summaryStatLabel}>{name}</span>
                  <span className={`${styles.summaryStatValue} ${styles.debtColor}`}>
                    {formatCurrency(Math.abs(latest.balance))}
                  </span>
                  <span className={styles.balanceMeta}>
                    {delta && (
                      <span className={delta.isUp ? styles.deltaDown : styles.deltaUp}>
                        <span className={styles.deltaArrow}>{delta.isUp ? "↑" : "↓"}</span>
                        {Math.round(Math.abs(delta.pct))}%
                      </span>
                    )}
                    <span className={styles.summaryBalanceDate}>{formatDate(latest.date)}</span>
                  </span>
                </div>
              );
            })}
          </div>
          </div>
        )}
      </div>

      <div className={styles.sparklineRow}>
        {vests.length > 0 && (
          <div className={styles.sparklineCard}>
            <span className={styles.sparklineTitle}>Total RSU Value</span>
            {vests.length < 2 ? (
              <span className={styles.summaryEmpty}>Need at least 2 vesting events</span>
            ) : (
              <Sparkline
                data={(() => {
                  let running = 0;
                  return [...vests]
                    .sort((a, b) => new Date(a.vestDate).getTime() - new Date(b.vestDate).getTime())
                    .map((v) => {
                      running += v.shares * v.price;
                      return { label: formatShortDate(v.vestDate), value: running };
                    });
                })()}
                color="var(--fg-success, #4ade80)"
              />
            )}
          </div>
        )}
        <div className={styles.sparklineCard}>
          <span className={styles.sparklineTitle}>Total Portfolio Balance</span>
          {snapshots.length < 2 ? (
            <span className={styles.summaryEmpty}>Need at least 2 snapshots</span>
          ) : (
            <Sparkline
              data={Object.entries(
                snapshots
                  .filter((s) => (s.type ?? "asset") !== "debt")
                  .reduce<Record<string, number>>((acc, s) => {
                    const dateKey = s.date.slice(0, 10);
                    acc[dateKey] = (acc[dateKey] || 0) + s.balance;
                    return acc;
                  }, {})
              )
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, total]) => ({ label: formatShortDate(date), value: total }))}
              color="var(--fg-info, #60a5fa)"
            />
          )}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>RSU Vests</span>
          <button className={styles.addBtn} onClick={() => { handleCancelRsu(); setShowRsuForm(!showRsuForm); }}>
            {showRsuForm ? "Cancel" : "+ Add Vest"}
          </button>
        </div>

        {showRsuForm && (
          <div className={styles.inlineForm}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Vest Date</span>
              <input
                className={styles.fieldInput}
                type="date"
                value={rsuForm.vestDate ?? ""}
                onChange={(e) => setRsuForm({ ...rsuForm, vestDate: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Shares</span>
              <input
                className={styles.fieldInput}
                type="number"
                step="any"
                value={rsuForm.shares ?? ""}
                onChange={(e) => setRsuForm({ ...rsuForm, shares: Number(e.target.value) })}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Price/Share</span>
              <input
                className={styles.fieldInput}
                type="number"
                step="any"
                value={rsuForm.price ?? ""}
                onChange={(e) => setRsuForm({ ...rsuForm, price: Number(e.target.value) })}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Description</span>
              <input
                className={styles.fieldInput}
                type="text"
                value={rsuForm.description ?? ""}
                onChange={(e) => setRsuForm({ ...rsuForm, description: e.target.value })}
                placeholder="e.g. Q1 2026 vest"
              />
            </div>
            <div className={styles.formActions}>
              <button className={styles.saveBtn} onClick={handleSaveRsu}>Save</button>
              <button className={styles.cancelBtn} onClick={handleCancelRsu}>Cancel</button>
            </div>
          </div>
        )}

        {sortedVests.length > 0 && (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Shares</th>
                  <th>Price/Share</th>
                  <th className={styles.num}>Total Value</th>
                  <th>Description</th>
                  <th className={styles.actionsCell}></th>
                </tr>
              </thead>
              <tbody>
                {sortedVests.map((v) => (
                  <tr key={v.id}>
                    <td>{formatDate(v.vestDate)}</td>
                    <td>{v.shares.toLocaleString()}</td>
                    <td>{formatCurrency(v.price)}</td>
                    <td className={styles.num}>{formatCurrency(v.shares * v.price)}</td>
                    <td>{v.description}</td>
                    <td className={styles.actionsCell}>
                      <button className={styles.actionBtn} onClick={() => handleEditRsu(v)}>Edit</button>
                      <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => removeVest(v.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Balance Snapshots</span>
          <button className={styles.addBtn} onClick={() => { handleCancelSnapshot(); setShowSnapshotForm(!showSnapshotForm); }}>
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
                onChange={(e) => setSnapshotForm({ ...snapshotForm, accountName: e.target.value })}
                placeholder="e.g. 401k - Fidelity"
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Date</span>
              <input
                className={styles.fieldInput}
                type="date"
                value={snapshotForm.date ?? ""}
                onChange={(e) => setSnapshotForm({ ...snapshotForm, date: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Balance</span>
              <input
                className={styles.fieldInput}
                type="number"
                step="any"
                value={snapshotForm.balance ?? ""}
                onChange={(e) => setSnapshotForm({ ...snapshotForm, balance: Number(e.target.value) })}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Notes</span>
              <input
                className={styles.fieldInput}
                type="text"
                value={snapshotForm.notes ?? ""}
                onChange={(e) => setSnapshotForm({ ...snapshotForm, notes: e.target.value })}
                placeholder="optional"
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Type</span>
              <select
                className={styles.fieldInput}
                value={snapshotForm.type ?? "asset"}
                onChange={(e) => setSnapshotForm({ ...snapshotForm, type: e.target.value as "asset" | "debt" })}
              >
                <option value="asset">Asset</option>
                <option value="debt">Debt</option>
              </select>
            </div>
            <div className={styles.formActions}>
              <button className={styles.saveBtn} onClick={handleSaveSnapshot}>Save</button>
              <button className={styles.cancelBtn} onClick={handleCancelSnapshot}>Cancel</button>
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
                    <td className={`${styles.num} ${s.balance >= 0 ? styles.money : styles.debtMoney}`}>{formatCurrency(s.balance)}</td>
                    <td>{s.notes ?? ""}</td>
                    <td><span className={s.type === "debt" ? styles.typeDebt : styles.typeAsset}>{(s.type ?? "asset").toUpperCase()}</span></td>
                    <td className={styles.actionsCell}>
                      <button className={styles.actionBtn} onClick={() => handleEditSnapshot(s)}>Edit</button>
                      <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => removeSnapshot(s.id)}>Delete</button>
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

function Sparkline({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(400);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const height = 70;
  const pad = { top: 4, right: 40, bottom: 24, left: 40 };
  const innerW = Math.max(width - pad.left - pad.right, 1);
  const innerH = height - pad.top - pad.bottom;

  const values = data.map((d) => d.value);
  const yMin = Math.min(0, ...values);
  const yMax = Math.max(...values);
  const yRange = yMax - yMin || 1;

  const xScale = (i: number) => pad.left + (i / Math.max(data.length - 1, 1)) * innerW;
  const yScale = (v: number) => pad.top + innerH - ((v - yMin) / yRange) * innerH;

  const pathD = data.map((d, i) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScale(d.value)}`).join("");
  const areaD = `${pathD}L${xScale(data.length - 1)},${yScale(0)}L${xScale(0)},${yScale(0)}Z`;

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      <svg width={width} height={height} className={styles.sparklineSvg}>
        <path d={areaD} fill={color} opacity={0.1} />
        <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => {
          const isFirst = i === 0;
          const isLast = i === data.length - 1;
          const isMid = data.length > 2 && i === Math.floor((data.length - 1) / 2);
          return isFirst || isLast || isMid ? (
            <text
              key={i}
              x={xScale(i)}
              y={height - 4}
              textAnchor="middle"
              fill="var(--fg-subtle, #6b6b7b)"
              fontSize="8"
            >
              {d.label}
            </text>
          ) : null;
        })}
      </svg>
    </div>
  );
}
