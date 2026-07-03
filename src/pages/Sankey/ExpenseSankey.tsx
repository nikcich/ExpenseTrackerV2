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
import { useAllTags } from "@/utils/tags";
import { SankeyCard } from "@/components/charts/SankeyCard";
import { SankeyData } from "@/components/Sankey/Sankey";

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

function buildCashFlowSankey(
  income: Expense[],
  savings: Expense[],
  trueExpenses: Expense[],
  tags: string[]
): SankeyData {
  const incomeTotal = sumAmounts(income);
  const savingsTotal = sumAmounts(savings);
  const expensesTotal = sumAmounts(trueExpenses);

  const expensesByTag: Record<string, number> = Object.fromEntries(
    tags.map((tag) => [tag, 0])
  );

  for (const expense of trueExpenses) {
    for (const tag of expense.tags) {
      if (tag in expensesByTag) {
        expensesByTag[tag] += expense.amount;
        break;
      }
    }
  }

  const spending = expensesTotal + savingsTotal;
  const excessTotal = incomeTotal - spending;

  const nodes = [
    {
      id: "income",
      label: `Income (After tax & Deductions) – ${formatMoney(Math.abs(incomeTotal))}`,
      color: "#2ecc71",
    },
    {
      id: "savings",
      label: `Savings – ${formatMoney(savingsTotal)}`,
      color: "#dbc234ff",
    },
    ...tags
      .filter((t) => expensesByTag[t] > 0.009)
      .map((tag) => {
        const value = expensesByTag[tag];
        return {
          id: `tag:${tag}`,
          label: value > 0 ? `${tag} – ${formatMoney(value)}` : tag,
          color: "#ff7b00ff",
        };
      }),
    {
      id: "excess",
      label: `Unallocated – ${formatMoney(excessTotal)}`,
      color: "#ff0000ff",
    },
  ];

  const links = [
    {
      source: "income",
      target: "savings",
      value: savingsTotal,
    },
    {
      source: "income",
      target: "excess",
      value: excessTotal,
    },
  ];

  for (const tag of tags) {
    const value = expensesByTag[tag];
    if (value > 0) {
      links.push({
        source: "income",
        target: `tag:${tag}`,
        value,
      });
    }
  }

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
  const tags = useAllTags();

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
    () => buildCashFlowSankey(income, savings, expense, [...tags]),
    [income, expense, savings, tags]
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
