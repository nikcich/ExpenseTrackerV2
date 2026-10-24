import type { BalanceSnapshot } from "@/types/types";
import { formatShortDate } from "@/utils/utils";

export function latestByAccount(items: BalanceSnapshot[]): Map<string, BalanceSnapshot> {
  const map = new Map<string, BalanceSnapshot>();
  for (const s of items) {
    const existing = map.get(s.accountName);
    if (!existing || new Date(s.date) > new Date(existing.date)) {
      map.set(s.accountName, s);
    }
  }
  return map;
}

export type AccountHistory = { name: string; snapshots: BalanceSnapshot[] };

export function groupByAccountSorted(items: BalanceSnapshot[]): AccountHistory[] {
  const names = [...new Set(items.map((s) => s.accountName))];
  return names.map((name) => ({
    name,
    snapshots: items
      .filter((s) => s.accountName === name)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  }));
}

export type AccountDelta = { isUp: boolean; pct: number };

export function computeAccountDelta(
  latest: BalanceSnapshot,
  prev: BalanceSnapshot | undefined
): AccountDelta | null {
  if (!prev || prev.balance === 0) return null;
  const pct = ((latest.balance - prev.balance) / Math.abs(prev.balance)) * 100;
  return { isUp: latest.balance > prev.balance, pct };
}

// Shared by both time series below: merges each account's own history onto
// one combined date axis via a running per-account pointer, carrying the
// last-known balance forward between an account's own snapshot dates.
function mergeAccountTimeSeries(
  items: BalanceSnapshot[],
  valueFor: (accountName: string, balance: number) => number
): { label: string; value: number }[] {
  const byAccount = new Map<string, BalanceSnapshot[]>();
  for (const s of items) {
    const list = byAccount.get(s.accountName) ?? [];
    list.push(s);
    byAccount.set(s.accountName, list);
  }
  for (const list of byAccount.values()) {
    list.sort((a, b) => a.date.localeCompare(b.date));
  }

  const allDates = [...new Set(items.map((s) => s.date.slice(0, 10)))].sort();

  const current = new Map<string, number>();
  const ptr = new Map<string, number>();
  for (const k of byAccount.keys()) ptr.set(k, 0);

  return allDates.map((date) => {
    for (const [acct, hist] of byAccount) {
      let i = ptr.get(acct)!;
      while (i < hist.length && hist[i].date.slice(0, 10) <= date) {
        current.set(acct, hist[i].balance);
        i++;
      }
      ptr.set(acct, i);
    }
    let total = 0;
    for (const [acct, v] of current) total += valueFor(acct, v);
    return { label: formatShortDate(date), value: total };
  });
}

export function computeBalanceTimeSeries(
  items: BalanceSnapshot[],
  negate: boolean
): { label: string; value: number }[] {
  return mergeAccountTimeSeries(items, (_acct, v) => (negate ? -v : v));
}

export function computeNetWorthTimeSeries(
  snapshots: BalanceSnapshot[],
  debts: BalanceSnapshot[]
): { label: string; value: number }[] {
  const debtAccountNames = new Set(debts.map((s) => s.accountName));
  return mergeAccountTimeSeries(snapshots, (acct, v) =>
    debtAccountNames.has(acct) ? -Math.abs(v) : v
  );
}
