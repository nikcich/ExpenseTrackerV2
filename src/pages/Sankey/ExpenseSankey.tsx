import { GenericPage } from "@/components/GenericPage/GenericPage";
import {
  useExpenses,
  useFilteredExpenses,
  useFilteredIncome,
  useFilteredSavings,
  useIncome,
  useSavings,
} from "@/hooks/expenses";
import { Expense } from "@/types/types";
import { BrushScrubber } from "@/components/Brush/BrushScrubber";
import { useMemo, useState } from "react";
import { SegmentGroup } from "@chakra-ui/react";
import { SankeyCard } from "@/components/charts/SankeyCard";
import {
  SankeyData,
  SankeyLink,
  SankeyNode,
} from "@/components/Sankey/Sankey";

const filterYear = (data: Expense[], beforeNow: number = 0) => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear() - beforeNow, 0, 1);
  const endOfYear = new Date(startOfYear.getFullYear() + 1, 0, 1);

  return data.filter((e) => {
    const d = new Date(e.date);
    return d < endOfYear && d >= startOfYear;
  });
};

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
const COLUMN_ALLOCATIONS = 0.32;
const COLUMN_GROUPS = 0.62;
const COLUMN_TAGS = 0.92;
const BAND = 0.96;
const NODE_GAP = 0.015;

function buildCashFlowSankey(
  income: Expense[],
  savings: Expense[],
  trueExpenses: Expense[]
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
      const tag = expense.tags[0] || "Untagged";
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
  const tagsTotal = tagEntries.reduce((sum, t) => sum + t.value, 0);

  // Plotly sizes node heights itself, globally proportional to value, and
  // inserts fixed gaps between neighbouring nodes in a column. Mirror that
  // here with a single value->height scale that lets every column fit
  // inside BAND, otherwise assigned centers drift from drawn rectangles
  // and the chart overlaps/scrambles.
  const columns = [
    { count: 1, total: Math.max(incomeTotal, 0) },
    {
      count: allocations.length,
      total: allocations.reduce((sum, a) => sum + a.value, 0),
    },
    { count: groups.length, total: groupsTotal },
    { count: tagEntries.length, total: tagsTotal },
  ];
  const scale = Math.min(
    ...columns.map((c) =>
      c.count === 0 || c.total <= 0
        ? Infinity
        : (BAND - NODE_GAP * (c.count - 1)) / c.total
    )
  );

  const yStack = (values: number[], total: number): number[] => {
    if (!isFinite(scale) || total <= 0 || values.length === 0) {
      return values.map(() => 0.5);
    }
    const extent = total * scale + NODE_GAP * (values.length - 1);
    let cursor = (1 - extent) / 2;
    return values.map((value) => {
      const height = value * scale;
      const y = cursor + height / 2;
      cursor += height + NODE_GAP;
      return y;
    });
  };

  const columnXs = [
    COLUMN_INCOME,
    COLUMN_ALLOCATIONS,
    COLUMN_GROUPS,
    COLUMN_TAGS,
  ];

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
      total
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
  pushColumn(
    2,
    groups.map(({ name, total }) => ({
      id: `group:${name}`,
      label: `${name} – ${formatMoney(total)}`,
      color: "#8b5cf6",
      value: total,
    })),
    "expenses"
  );
  pushColumn(
    3,
    tagEntries.map(({ tag, value, group }) => ({
      id: `tag:${group}:${tag}`,
      label: `${tag} – ${formatMoney(value)}`,
      color: "#ff7b00ff",
      value,
      source: `group:${group}`,
    }))
  );

  return { nodes, links };
}

enum Mode {
  YEAR = "YEAR TO DATE",
  ALL_TIME = "ALL TIME",
  RANGE = "RANGE",
}

const filterExpenseMode = (
  mode: Mode,
  rawData: Expense[],
  filteredData: Expense[]
) => {
  if (mode === Mode.RANGE) return filteredData;

  if (mode === Mode.ALL_TIME) return rawData;

  return filterYear(rawData);
};

export function ExpenseSankey() {
  const [mode, setMode] = useState<Mode>(Mode.RANGE);

  const rawExpenses = useExpenses();
  const rawIncome = useIncome();
  const rawSavings = useSavings();
  const filteredIncome = useFilteredIncome();
  const filteredExpenses = useFilteredExpenses();
  const filteredSavings = useFilteredSavings();

  const income = useMemo(
    () => filterExpenseMode(mode, rawIncome, filteredIncome),
    [mode, filteredIncome, rawIncome]
  );
  const expense = useMemo(
    () => filterExpenseMode(mode, rawExpenses, filteredExpenses),
    [mode, filteredExpenses, rawExpenses]
  );
  const savings = useMemo(
    () => filterExpenseMode(mode, rawSavings, filteredSavings),
    [mode, filteredSavings, rawSavings]
  );

  const sankeyData = useMemo(
    () => buildCashFlowSankey(income, savings, expense),
    [income, expense, savings]
  );

  return (
    <GenericPage
      title="Comp and Spending Flow Chart"
      hasRange={mode === Mode.RANGE}
      footer={mode === Mode.RANGE ? <BrushScrubber /> : <></>}
      actions={
        <>
          <SegmentGroup.Root
            value={mode}
            onValueChange={(e) => setMode(e.value as Mode)}
          >
            <SegmentGroup.Indicator />
            <SegmentGroup.Items items={Object.values(Mode)} />
          </SegmentGroup.Root>
        </>
      }
    >
      <div style={{ padding: "1.5rem 2rem", height: "100%", display: "flex", flexDirection: "column" }}>
        <SankeyCard data={sankeyData} />
      </div>
    </GenericPage>
  );
}
