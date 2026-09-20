import { Expense } from "@/types/types";
import { tagLabel } from "@/utils/expense-utils";
import { colorForName } from "@/utils/colors";
import { Breakdown } from "@/components/charts/BreakdownToggle";
import {
  SankeyData,
  SankeyLink,
  SankeyNode,
} from "@/components/Sankey/Sankey";

const sumAmounts = (expenses: Expense[]): number => {
  const num = expenses.reduce((sum, e) => sum + e.amount, 0);
  return parseFloat(num.toFixed(2));
};

const formatMoney = (value: number) => {
  const abs = Math.abs(value);

  if (abs < 1000) {
    return `$${value.toFixed(2)}`;
  }

  return `$${(value / 1000).toFixed(2)}k`;
};

const UNGROUPED = "Ungrouped";

const COLUMN_INCOME = 0;
const COLUMN_MIDDLE = 0.46;
const COLUMN_TERMINAL = 0.92;
const BAND = 0.96;
const NODE_GAP = 0.015;
const TERMINAL_GAP = 0.03;

export function buildCashFlowSankey(
  income: Expense[],
  savings: Expense[],
  trueExpenses: Expense[],
  breakdown: Breakdown
): SankeyData {
  const incomeTotal = sumAmounts(income);
  const savingsTotal = sumAmounts(savings);
  const expensesTotal = sumAmounts(trueExpenses);

  const excessTotal = incomeTotal - expensesTotal - savingsTotal;

  const expenseBuckets = new Map<string, Expense[]>();
  const addToBucket = (key: string, expense: Expense) => {
    const bucket = expenseBuckets.get(key);
    if (bucket) bucket.push(expense);
    else expenseBuckets.set(key, [expense]);
  };
  for (const expense of trueExpenses) {
    addToBucket(expense.group ?? UNGROUPED, expense);
  }

  const catchAllLast = (name: string) => (name === UNGROUPED ? 1 : 0);

  const groups = [...expenseBuckets.entries()]
    .map(([name, bucket]) => ({ name, bucket, total: sumAmounts(bucket) }))
    .filter(({ total }) => total >= 0.009)
    .sort(
      (a, b) =>
        catchAllLast(a.name) - catchAllLast(b.name) || b.total - a.total
    );

  const groupTags = new Map<string, { tag: string; value: number }[]>();
  for (const { name, bucket } of groups) {
    const byTag = new Map<string, number>();
    for (const expense of bucket) {
      const tag = tagLabel(expense);
      byTag.set(tag, (byTag.get(tag) ?? 0) + expense.amount);
    }
    groupTags.set(
      name,
      [...byTag.entries()]
        .map(([tag, value]) => ({ tag, value }))
        .filter(({ value }) => value >= 0.009)
        .sort((a, b) => b.value - a.value)
    );
  }

  type Allocation = {
    id: string;
    label: string;
    color: string;
    value: number;
  };
  const allocations: Allocation[] = [
    {
      id: "expenses",
      label: `Expenses – ${formatMoney(expensesTotal)}`,
      color: "#3b82f6",
      value: expensesTotal,
    },
  ];
  if (savingsTotal >= 0.009) {
    allocations.push({
      id: "savings",
      label: `Savings – ${formatMoney(savingsTotal)}`,
      color: "#facc15",
      value: savingsTotal,
    });
  }
  if (excessTotal >= 0.009) {
    allocations.push({
      id: "excess",
      label: `Unallocated – ${formatMoney(excessTotal)}`,
      color: "#ff0000ff",
      value: excessTotal,
    });
  }

  const nodes: SankeyNode[] = [
    {
      id: "income",
      label: `Income (After tax & Deductions) – ${formatMoney(Math.abs(incomeTotal))}`,
      color: "#2ecc71",
      x: COLUMN_INCOME,
      y: 0.5,
    },
  ];

  const links: SankeyLink[] = [];

  const groupsTotal = groups.reduce((sum, g) => sum + g.total, 0);
  const tagEntries = groups.flatMap(({ name }) =>
    (groupTags.get(name)!).map((t) => ({ ...t, group: name }))
  );

  const mergedTags = [...tagEntries.reduce((map, { tag, value }) => {
    map.set(tag, (map.get(tag) ?? 0) + value);
    return map;
  }, new Map<string, number>()).entries()]
    .filter(([, value]) => value >= 0.009)
    .sort((a, b) => b[1] - a[1]);

  const terminalEntries =
    breakdown === "GROUPS"
      ? groups.map(({ name, total }) => ({
          id: `group:${name}`,
          label: `${name} – ${formatMoney(total)}`,
          color: colorForName(name),
          value: total,
          source: "expenses" as string,
        }))
      : mergedTags.map(([tag, value]) => ({
          id: `tag:${tag}`,
          label: `${tag} – ${formatMoney(value)}`,
          color: colorForName(tag),
          value,
          source: "expenses" as string,
        }));

  const terminalTotal =
    breakdown === "GROUPS"
      ? groupsTotal
      : mergedTags.reduce((sum, [, value]) => sum + value, 0);

  // Each column gets its own value->height scale so it can fit exactly
  // inside BAND with its own gap, independent of the other columns. A single
  // global scale would let the biggest column shrink every other column.
  const colScale = (count: number, total: number, gap: number): number =>
    count === 0 || total <= 0 ? 0 : (BAND - gap * (count - 1)) / total;

  const columnXs = [COLUMN_INCOME, COLUMN_MIDDLE, COLUMN_TERMINAL];
  const colGaps = [NODE_GAP, NODE_GAP, TERMINAL_GAP];
  const colTotals = [
    Math.max(incomeTotal, 0),
    allocations.reduce((sum, a) => sum + a.value, 0),
    terminalTotal,
  ];
  const colCounts = [1, allocations.length, terminalEntries.length];
  const colScales = colCounts.map((_, i) =>
    colScale(colCounts[i], colTotals[i], colGaps[i])
  );

  const yStack = (
    values: number[],
    total: number,
    gap: number,
    scale: number
  ): number[] => {
    if (scale <= 0 || total <= 0 || values.length === 0) {
      return values.map(() => 0.5);
    }
    const extent = total * scale + gap * (values.length - 1);
    let cursor = (1 - extent) / 2;
    return values.map((value) => {
      const height = value * scale;
      const y = cursor + height / 2;
      cursor += height + gap;
      return y;
    });
  };

  type ColumnEntry = {
    id: string;
    label: string;
    color?: string;
    value: number;
    source?: string;
  };

  const pushColumn = (
    columnIndex: number,
    entries: ColumnEntry[],
    defaultSource?: string
  ) => {
    const total = entries.reduce((sum, e) => sum + e.value, 0);
    const ys = yStack(
      entries.map((e) => e.value),
      total,
      colGaps[columnIndex],
      colScales[columnIndex]
    );
    entries.forEach(({ id, label, color, value, source }, i) => {
      nodes.push({
        id,
        label,
        color,
        x: columnXs[columnIndex],
        y: ys[i],
      });
      links.push({
        source: source ?? defaultSource ?? "income",
        target: id,
        value,
      });
    });
  };

  pushColumn(1, allocations);
  pushColumn(2, terminalEntries);

  return { nodes, links };
}
