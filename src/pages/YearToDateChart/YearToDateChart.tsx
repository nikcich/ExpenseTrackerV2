import { GenericPage } from "@/components/GenericPage/GenericPage";
import {
  useDateExtents,
  useExpenses,
  useIncome,
  useRetirement,
  useSavings,
} from "@/hooks/expenses";
import { useMemo, useState } from "react";
import { Expense } from "@/types/types";
import { LineChart } from "@/components/charts/LineChart";
import { chartDateCompare } from "@/utils/utils";
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

const filterAllExpensesYear = (
  income: Expense[],
  expenses: Expense[],
  savings: Expense[],
  retirement: Expense[],
  beforeNow: number = 0
): [Expense[], Expense[], Expense[], Expense[]] => {
  const filteredIncome = filterYear(income, beforeNow);
  const filteredExpenses = filterYear(expenses, beforeNow);
  const filteredSavings = filterYear(savings, beforeNow);
  const filteredRetirement = filterYear(retirement, beforeNow);

  return [
    filteredIncome,
    filteredExpenses,
    filteredSavings,
    filteredRetirement,
  ];
};

const getMonthKey = (i: number) => {
  return new Date(2025, i - 1, 1).toLocaleString("default", { month: "short" });
};

const groupAndSum = (data: Expense[]) => {
  const monthlyTotals: { [key: string]: number } = {};
  const groupedData: { group: string; total: number }[] = [];
  const sortedData = data
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (let i = 1; i <= 12; i++) {
    // const monthKey = `${i}`;
    const monthKey = getMonthKey(i);
    monthlyTotals[monthKey] = 0;
  }

  for (const expense of sortedData) {
    const date = new Date(expense.date);
    const monthKey = getMonthKey(date.getMonth() + 1);
    monthlyTotals[monthKey] += expense.amount;
  }

  let runningTotal = 0;
  for (let i = 1; i <= 12; i++) {
    const currentMonthKey = getMonthKey(i);

    runningTotal += monthlyTotals[currentMonthKey];

    groupedData.push({
      group: currentMonthKey,
      total: runningTotal,
    });
  }

  return groupedData;
};

function normalizeRange(start1: number, end1: number, value: number): number {
  const range = end1 - start1;
  const normalizedStart = 0;
  const normalizedEnd = range;
  return (
    ((value - start1) * (normalizedEnd - normalizedStart)) / range +
    normalizedStart
  );
}

function withTransparency(hexColor: string, num: number, years: number[]) {
  const minYear = Math.max(...years);
  const maxYear = Math.min(...years);
  const range = minYear - maxYear + 1;
  const step = 255 / (range + 1);
  const alpha = Math.max(0, 255 - normalizeRange(maxYear, minYear, num) * step);

  const alphaHex = alpha.toString(16).padStart(2, "0");

  return hexColor.slice(0, 7) + alphaHex;
}

const createChart = (
  name: string,
  color: string,
  sortedGroupedExpenses: any[],
  groups: string[]
) => {
  return {
    name,
    y: groups.map((group) => {
      const expenseValue =
        sortedGroupedExpenses.find((e) => e.group === group)?.total ?? 0;
      return Math.abs(expenseValue);
    }),
    color,
  };
};

export const YearToDateChartCore = ({
  legend = true,
  legendDirection = "v",
  years = [0, 1],
}: {
  legend?: boolean;
  legendDirection?: "v" | "h";
  years?: [number, number];
}) => {
  const rawExpenses = useExpenses();
  const rawIncome = useIncome();
  const rawSavings = useSavings();
  const rawRetirement = useRetirement();

  const { charts, groups } = useMemo(() => {
    const groups = years.map((year) => {
      const currentYearFiltered = filterAllExpensesYear(
        rawIncome,
        rawExpenses,
        rawSavings,
        rawRetirement,
        year
      );

      const currYearGrouped = currentYearFiltered.map((curr) =>
        groupAndSum(curr)
      );
      return currYearGrouped;
    });

    const groupsSet = new Set(groups.flat(2).map((item) => item.group));
    const finalGroups = Array.from(groupsSet).sort((a, b) =>
      chartDateCompare(a, b)
    );

    const charts = years
      .map((year, index) => {
        const [yearIncome, yearExpenses, yearSavings, yearRetirement] =
          groups[index];
        const thisYear = new Date(
          new Date().getFullYear() - year,
          0,
          1
        ).getFullYear();

        return [
          createChart(
            `${thisYear} Income`,
            withTransparency("#00a100ff", year, years),
            yearIncome,
            finalGroups
          ),
          createChart(
            `${thisYear} Expenses`,
            withTransparency("#bb0000ff", year, years),
            yearExpenses,
            finalGroups
          ),
          createChart(
            `${thisYear} Savings`,
            withTransparency("#ffd000ff", year, years),
            yearSavings,
            finalGroups
          ),
          createChart(
            `${thisYear} Retirement`,
            withTransparency("#ff00c8ff", year, years),
            yearRetirement,
            finalGroups
          ),
        ];
      })
      .flat();

    return {
      charts,
      groups: finalGroups,
    };
  }, [rawExpenses, rawIncome, rawSavings]);

  return (
    <LineChart
      legend={legend}
      legendDirection={legendDirection}
      x={groups}
      barCharts={charts}
    />
  );
};

const getYearsInRange = (range: [Date, Date]): number[] => {
  const start = range[0];
  const end = range[1];
  const years: number[] = [];

  let current = start;
  while (current.getFullYear() <= end.getFullYear()) {
    years.push(current.getFullYear());
    current.setFullYear(current.getFullYear() + 1);
  }

  return years;
};

const getYearsRelative = (years: number[]): number[] => {
  const currentYear = new Date().getFullYear();
  return years
    .map((year) => Math.abs(year - currentYear))
    .sort((a, b) => b - a);
};

const get2YearWindowPairs = (relativeYears: number[]): [number, number][] => {
  if (relativeYears.length < 2) return [[0, 1]];

  const pairs = [];
  for (let i = 0; i < relativeYears.length - 1; i++) {
    const pair: [number, number] = [relativeYears[i], relativeYears[i + 1]];
    pairs.push(pair);
  }
  return pairs;
};

export function YearToDateChart() {
  const extents = useDateExtents();
  const years = getYearsInRange(extents);
  const relativeYears = getYearsRelative(years);
  const yearGroups = get2YearWindowPairs(relativeYears);
  const [yearSelection, setYearSelection] = useState<string | null>(
    `${yearGroups.length - 1}`
  );
  const currentSelection =
    yearSelection !== null ? yearGroups[Number(yearSelection)] : yearGroups[0];

  return (
    <GenericPage
      title="Year To Date"
      hasRange={false}
      actions={
        <>
          <SegmentGroup.Root
            value={yearSelection}
            onValueChange={(e) => setYearSelection(e.value)}
          >
            <SegmentGroup.Indicator />
            <SegmentGroup.Items
              items={yearGroups.map((group, index) => ({
                value: `${index}`,
                label: `${new Date().getFullYear() - group[0]} vs ${new Date().getFullYear() - group[1]}`,
              }))}
            />
          </SegmentGroup.Root>
        </>
      }
    >
      <YearToDateChartCore years={currentSelection} />
    </GenericPage>
  );
}
