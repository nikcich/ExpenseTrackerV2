import { GenericPage } from "@/components/GenericPage/GenericPage";
import {
  useExpenses,
  useFilteredExpenses,
  useFilteredIncome,
  useFilteredRetirement,
  useFilteredRsu,
  useFilteredSavings,
  useIncome,
  useRetirement,
  useRsu,
  useSavings,
} from "@/hooks/expenses";
import { ALL_EXPENSE_TAGS, Expense, NonExpenseTags } from "@/types/types";
import { Sankey } from "@/components/Sankey/Sankey";
import { BrushScrubber } from "@/components/Brush/BrushScrubber";
import { useMemo, useState } from "react";
import { SegmentGroup } from "@chakra-ui/react";
import { useSettingsStore } from "@/store/SettingsStore";

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
  rsus: Expense[],
  retirement: Expense[]
): SankeyData {
  const incomeTotal = sumAmounts(income);
  const savingsTotal = sumAmounts(savings);
  const expensesTotal = sumAmounts(trueExpenses);
  const rsuTotal = -sumAmounts(rsus); // Invert because its income so its negative by default
  const retirementTotal = sumAmounts(retirement);
  const tcTotal = incomeTotal - rsuTotal;

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

  const spending = expensesTotal + savingsTotal + rsuTotal;
  const excessTotal = Math.abs(tcTotal) - spending;

  console.log(spending, tcTotal);

  const nodes: SankeyNode[] = [
    {
      id: "retirementded",
      label: `Retirement Deductions – ${formatMoney(Math.abs(retirementTotal))}`,
      color: "#3498db",
    },
    {
      id: "retirement",
      label: `Retirement – ${formatMoney(Math.abs(retirementTotal))}`,
      color: "#3498db",
    },
    {
      id: "base",
      label: `Base Salary (After tax & Deductions) – ${formatMoney(Math.abs(incomeTotal))}`,
      color: "#3498db",
    },
    {
      id: "stock",
      label: `RSU Vesting – ${formatMoney(Math.abs(rsuTotal))}`,
      color: "#3498db",
    },
    {
      id: "income",
      label: `Total Comp – ${formatMoney(Math.abs(tcTotal))}`,
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
      color: "#dbc234ff",
    },
    ...ALL_EXPENSE_TAGS.filter((t) => expensesByTag[t] > 0.009).map((tag) => {
      // FLoats are dumb
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

  const links: SankeyLink[] = [
    {
      source: "retirementded",
      target: "retirement",
      value: Math.abs(retirementTotal),
    },
    {
      source: "base",
      target: "income",
      value: Math.abs(incomeTotal),
    },
    {
      source: "stock",
      target: "income",
      value: rsuTotal,
    },
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
  const rawIncome = useIncome(false);
  const rawSavings = useSavings(false);
  const rawRsu = useRsu();
  const rawRetirement = useRetirement();

  const filteredIncome = useFilteredIncome(false);
  const filteredExpenses = useFilteredExpenses();
  const filteredSavings = useFilteredSavings(false);
  const filteredRsu = useFilteredRsu();
  const filteredRetirement = useFilteredRetirement();

  const enabledTags = useSettingsStore("enabledTags");
  const includeRSU = enabledTags.includes(NonExpenseTags.RSU);

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
    return includeRSU ? filterExpenseMode(mode, rawRsu, filteredRsu) : [];
  }, [mode, filteredRsu, rawRsu]);

  const retirement = useMemo(() => {
    return filterExpenseMode(mode, rawRetirement, filteredRetirement);
  }, [mode, filteredRetirement, rawRetirement]);

  const sankeyData = useMemo(() => {
    return buildCashFlowSankey(income, savings, expense, rsu, retirement);
  }, [income, expense, savings, rsu, retirement]);

  return <Sankey data={sankeyData} />;
};

export function ExpenseSankey() {
  const [mode, setMode] = useState<Mode>(Mode.RANGE);

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
      <SankeyCore mode={mode} />
    </GenericPage>
  );
}
