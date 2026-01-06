import { GenericPage } from "@/components/GenericPage/GenericPage";
import {
  useExpenses,
  useFilteredExpenses,
  useFilteredIncome,
  useFilteredRsu,
  useFilteredSavings,
  useIncome,
  useRsu,
  useSavings,
} from "@/hooks/expenses";
import { ALL_EXPENSE_TAGS, Expense } from "@/types/types";
import { Sankey } from "@/components/Sankey/Sankey";
import { BrushScrubber } from "@/components/Brush/BrushScrubber";
import { useMemo, useState } from "react";
import { SegmentGroup } from "@chakra-ui/react";

const filterYear = (data: Expense[], beforeNow: number = 0) => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear() - beforeNow, 0, 1);
  const endOfYear = new Date(startOfYear.getFullYear() + 1, 0, 1);

  return data.filter((e) => {
    const d = new Date(e.date);
    return d < endOfYear && d >= startOfYear;
  });
};

const sumAmounts = (expenses: Expense[]) =>
  expenses.reduce((sum, e) => sum + e.amount, 0);

type SankeyNode = {
  id: string;
  label: string;
  color?: string;
};

type SankeyLink = {
  source: string;
  target: string;
  value: number;
};

type SankeyData = {
  nodes: SankeyNode[];
  links: SankeyLink[];
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
  rsus: Expense[]
): SankeyData {
  const incomeTotal = sumAmounts(income);
  const savingsTotal = sumAmounts(savings);
  const expensesTotal = sumAmounts(trueExpenses);
  const rsuTotal = -sumAmounts(rsus); // Invert because its income so its negative by default

  const expensesByTag: Record<string, number> = Object.fromEntries(
    ALL_EXPENSE_TAGS.map((tag) => [tag, 0])
  );

  for (const expense of trueExpenses) {
    for (const tag of expense.tags) {
      if (tag in expensesByTag) {
        expensesByTag[tag] += expense.amount;
        break;
      }
    }
  }

  const excessTotal =
    Math.abs(incomeTotal) - expensesTotal - savingsTotal - rsuTotal;

  const nodes: SankeyNode[] = [
    {
      id: "income",
      label: `Income – ${formatMoney(Math.abs(incomeTotal))}`,
      color: "#2ecc71",
    },
    {
      id: "savings",
      label: `Savings – ${formatMoney(savingsTotal)}`,
      color: "#dbc234ff",
    },
    {
      id: "rsu",
      label: `RSU's – ${formatMoney(rsuTotal)}`,
      color: "#3498db",
    },
    {
      id: "expenses",
      label: "Expenses",
      color: "#e67e22",
    },
    ...ALL_EXPENSE_TAGS.map((tag) => {
      const value = expensesByTag[tag];
      return {
        id: `tag:${tag}`,
        label: value > 0 ? `${tag} – ${formatMoney(value)}` : tag,
        color: "#e74c3c",
      };
    }),
    {
      id: "excess",
      label: `UNTRACKED MONEY – ${formatMoney(excessTotal)}`,
      color: "red",
    },
  ];

  const links: SankeyLink[] = [
    {
      source: "income",
      target: "savings",
      value: savingsTotal,
    },
    {
      source: "income",
      target: "rsu",
      value: rsuTotal,
    },
    {
      source: "income",
      target: "excess",
      value: excessTotal,
    },
  ];

  for (const tag of ALL_EXPENSE_TAGS) {
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

export const SankeyCore = ({ mode }: { mode: Mode }) => {
  const rawExpenses = useExpenses();
  const rawIncome = useIncome();
  const rawSavings = useSavings(false);
  const rawRsu = useRsu();

  const filteredIncome = useFilteredIncome();
  const filteredExpenses = useFilteredExpenses();
  const filteredSavings = useFilteredSavings();
  const filteredRsu = useFilteredRsu();

  const income = useMemo(() => {
    return filterExpenseMode(mode, rawIncome, filteredIncome);
  }, [mode, filteredIncome, rawIncome]);

  const expense = useMemo(() => {
    return filterExpenseMode(mode, rawExpenses, filteredExpenses);
  }, [mode, filteredExpenses, rawExpenses]);

  const savings = useMemo(() => {
    return filterExpenseMode(mode, rawSavings, filteredSavings);
  }, [mode, filteredSavings, rawSavings]);

  const rsu = useMemo(() => {
    return filterExpenseMode(mode, rawRsu, filteredRsu);
  }, [mode, filteredRsu, rawRsu]);

  const sankeyData = useMemo(() => {
    return buildCashFlowSankey(income, savings, expense, rsu);
  }, [income, expense, savings, rsu]);

  return <Sankey data={sankeyData} />;
};

export function ExpenseSankey() {
  const [mode, setMode] = useState<Mode>(Mode.ALL_TIME);

  return (
    <GenericPage
      title="Expense Sankey Chart"
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
      <SankeyCore mode={mode} />
    </GenericPage>
  );
}
