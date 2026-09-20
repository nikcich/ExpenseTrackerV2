import { ComponentType, useCallback, useMemo, useState } from "react";
import { NativeSelect } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { Expense, Mode } from "@/types/types";
import {
  useDateExtents,
  useFilteredExpenses,
  useFilteredIncome,
  useFilteredSavings,
  useExpenses,
  useIncome,
  useSavings,
} from "@/hooks/expenses";
import { useDebouncedBrushRange } from "@/store/store";
import {
  byDay,
  byGroup,
  byMonth,
  byTag,
  byYear,
  groupAndSumExpenses,
} from "@/utils/expense-utils";
import { chartDateCompare } from "@/utils/utils";
import { parseStackedFormat } from "@/components/charts/StackedBarChart";
import { AverageSpendingCard } from "@/components/charts/AverageSpendingCard";
import { GroupedBarChartCard } from "@/components/charts/GroupedBarChartCard";
import { RangeIncomeExpenseChartCard } from "@/components/charts/RangeIncomeExpenseChartCard";
import { SankeyCard } from "@/components/charts/SankeyCard";
import { TagStackedBarChartCard } from "@/components/charts/TagStackedBarChartCard";
import { YearToDateChartCard } from "@/components/charts/YearToDateChartCard";
import { Breakdown, BreakdownToggle } from "@/components/charts/BreakdownToggle";
import {
  ChartOpenPayload,
  FilterRule,
  dateRangeRules,
  periodDateRange,
  rulesFromChartPayload,
} from "@/utils/custom-filter";
import { setNavFilter } from "@/store/NavFilterStore";
import { Pages } from "@/types/routes";
import { buildCashFlowSankey } from "@/utils/sankey-flow";
import {
  createChart,
  filterAllExpensesYear,
  getYearsInRange,
  groupAndSum,
  withTransparency,
} from "@/utils/year-to-date";
import {
  ChartWidgetInstance,
  ChartWidgetType,
} from "@/store/ChartsStore";
import styles from "./Charts.module.scss";

const useChartOpen = () => {
  const navigate = useNavigate();
  return useCallback(
    (payload: ChartOpenPayload, mode: string, source: string) => {
      const rules = rulesFromChartPayload(payload, mode);
      if (rules.length === 0) return;
      setNavFilter(rules, source);
      navigate(Pages.TableView);
    },
    [navigate]
  );
};

type WidgetProps = { instance: ChartWidgetInstance };

const addTopLevelGroup = (
  data: { group: string; total: number }[],
  topLevel: string
) =>
  data.map((item) => ({
    group: `${item.group} > ${topLevel}`,
    total: item.total,
  }));

const averageSums = (
  data: { group: string; total: number }[],
  range: [number, number] | undefined
) => {
  if (!range) return data;

  const startDate = new Date(range[0]);
  const endDate = new Date(range[1]);
  const monthsInRange =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());
  const totalMonths = monthsInRange > 0 ? monthsInRange : 1;

  return data.map((item) => ({
    group: item.group,
    total: item.total / totalMonths,
  }));
};

function AverageSpendingWidget() {
  const filteredExpenses = useFilteredExpenses();
  const filteredSavings = useFilteredSavings();
  const [range] = useDebouncedBrushRange();
  const open = useChartOpen();

  const { traces, groupTraces } = useMemo(() => {
    const build = (keyFn: (e: Expense) => string | string[]) =>
      parseStackedFormat(
        averageSums(
          addTopLevelGroup(
            groupAndSumExpenses([...filteredExpenses, ...filteredSavings], keyFn),
            "Range Average"
          ),
          range
        )
      );
    return { traces: build(byTag), groupTraces: build(byGroup) };
  }, [filteredExpenses, filteredSavings, range]);

  return (
    <AverageSpendingCard
      traces={traces}
      groupTraces={groupTraces}
      onOpen={(payload) =>
        open(
          payload,
          "ALL",
          `Average Spending · ${payload.category ?? payload.period}`
        )
      }
    />
  );
}

function IncomeVsExpensesWidget() {
  const filteredExpenses = useFilteredExpenses();
  const filteredIncome = useFilteredIncome();
  const filteredSavings = useFilteredSavings();

  const totalExpenses = useMemo(
    () => filteredExpenses.reduce((acc, e) => acc + e.amount, 0),
    [filteredExpenses]
  );
  const totalIncome = useMemo(
    () => filteredIncome.reduce((acc, income) => acc + income.amount, 0),
    [filteredIncome]
  );
  const totalSavings = useMemo(
    () => filteredSavings.reduce((acc, savings) => acc + savings.amount, 0),
    [filteredSavings]
  );

  return (
    <RangeIncomeExpenseChartCard
      totalExpenses={totalExpenses}
      totalIncome={totalIncome}
      totalSavings={totalSavings}
    />
  );
}

const getGroupedAndSortedData = (mode: Mode, data: Expense[]) => {
  const grouped =
    mode === Mode.MONTHLY
      ? groupAndSumExpenses(data, byMonth)
      : mode === Mode.YEARLY
        ? groupAndSumExpenses(data, byYear)
        : groupAndSumExpenses(data, byDay);
  return grouped.sort((a, b) => chartDateCompare(a.group, b.group));
};

function DateGroupedWidget({ instance }: WidgetProps) {
  const mode = instance.mode ?? Mode.MONTHLY;
  const filteredExpenses = useFilteredExpenses();
  const filteredIncome = useFilteredIncome();
  const filteredSavings = useFilteredSavings();
  const navigate = useNavigate();

  const sortedGroupedExpenses = useMemo(
    () => getGroupedAndSortedData(mode, filteredExpenses),
    [filteredExpenses, mode]
  );
  const sortedGroupedIncome = useMemo(
    () => getGroupedAndSortedData(mode, filteredIncome),
    [filteredIncome, mode]
  );
  const sortedGroupedSavings = useMemo(
    () => getGroupedAndSortedData(mode, filteredSavings),
    [filteredSavings, mode]
  );

  const groups = useMemo(() => {
    const groupsSet = new Set<string>();
    sortedGroupedExpenses.forEach((e) => groupsSet.add(e.group));
    sortedGroupedIncome.forEach((e) => groupsSet.add(e.group));
    sortedGroupedSavings.forEach((e) => groupsSet.add(e.group));
    return Array.from(groupsSet).sort((a, b) => chartDateCompare(a, b));
  }, [sortedGroupedExpenses, sortedGroupedIncome, sortedGroupedSavings]);

  const barCharts = useMemo(
    () => [
      {
        name: "Expenses",
        y: groups.map((group) =>
          Math.abs(
            sortedGroupedExpenses.find((e) => e.group === group)?.total ?? 0
          )
        ),
        color: "#bb0000ff",
      },
      {
        name: "Income",
        y: groups.map((group) =>
          Math.abs(
            sortedGroupedIncome.find((e) => e.group === group)?.total ?? 0
          )
        ),
        color: "#00a100ff",
      },
      {
        name: "Savings",
        y: groups.map(
          (group) =>
            sortedGroupedSavings.find((e) => e.group === group)?.total ?? 0
        ),
        color: "#ffd000ff",
      },
    ],
    [groups, sortedGroupedExpenses, sortedGroupedIncome, sortedGroupedSavings]
  );

  const handleOpen = useCallback(
    (payload: ChartOpenPayload) => {
      const range = periodDateRange(mode, payload.period);
      const rules: FilterRule[] = range
        ? dateRangeRules(range.start, range.end)
        : [];
      if (payload.category === "Income" || payload.category === "Savings") {
        rules.push({
          id: `type_${payload.category.toLowerCase()}`,
          conjunction: "AND",
          negate: false,
          field: "type",
          operator: "equals",
          value: payload.category,
        });
      } else if (payload.category === "Expenses") {
        rules.push(
          {
            id: "type_not_income",
            conjunction: "AND",
            negate: true,
            field: "type",
            operator: "equals",
            value: "Income",
          },
          {
            id: "type_not_savings",
            conjunction: "AND",
            negate: true,
            field: "type",
            operator: "equals",
            value: "Savings",
          }
        );
      }
      if (rules.length === 0) return;
      setNavFilter(rules, `Date Grouped · ${payload.period}`);
      navigate(Pages.TableView);
    },
    [mode, navigate]
  );

  return (
    <GroupedBarChartCard
      barCharts={barCharts}
      groups={groups}
      onOpen={handleOpen}
    />
  );
}

function TagStackedWidget({ instance }: WidgetProps) {
  const mode = instance.mode ?? Mode.MONTHLY;
  const filteredExpenses = useFilteredExpenses();
  const open = useChartOpen();

  const dateKeyFn =
    mode === Mode.MONTHLY ? byMonth : mode === Mode.YEARLY ? byYear : byDay;

  const traces = useMemo(
    () => parseStackedFormat(groupAndSumExpenses(filteredExpenses, byTag, dateKeyFn)),
    [filteredExpenses, dateKeyFn]
  );

  const groupTraces = useMemo(
    () =>
      parseStackedFormat(groupAndSumExpenses(filteredExpenses, byGroup, dateKeyFn)),
    [filteredExpenses, dateKeyFn]
  );

  return (
    <TagStackedBarChartCard
      traces={traces}
      groupTraces={groupTraces}
      onOpen={(payload) =>
        open(
          payload,
          mode,
          `Stacked Bar · ${payload.category ?? payload.period}`
        )
      }
    />
  );
}

function YearToDateWidget() {
  const extents = useDateExtents();
  const currentYear = new Date().getFullYear();
  const availableYears = getYearsInRange(extents);
  const yearsDescending = [...availableYears].sort((a, b) => b - a);

  const [pair, setPair] = useState<[number, number]>(() => {
    const hasCurrent = availableYears.includes(currentYear);
    const hasPrev = availableYears.includes(currentYear - 1);
    if (hasCurrent && hasPrev) return [currentYear - 1, currentYear];
    const last = availableYears[availableYears.length - 1] ?? currentYear;
    const prev = availableYears[availableYears.length - 2] ?? last - 1;
    return [prev, last];
  });

  const selectYear = (index: 0 | 1, year: number) => {
    setPair((prev) => {
      const next: [number, number] = [...prev] as [number, number];
      const other = index === 0 ? 1 : 0;
      if (prev[other] === year) next[other] = prev[index];
      next[index] = year;
      return next;
    });
  };

  const selectedYears =
    availableYears.length >= 2 ? pair : [availableYears[0] ?? currentYear];
  const currentSelection = useMemo(
    () => selectedYears.map((year) => currentYear - year),
    [selectedYears, currentYear]
  );

  const rawExpenses = useExpenses();
  const rawIncome = useIncome();
  const rawSavings = useSavings();

  const { charts, groups } = useMemo(() => {
    const grouped = currentSelection.map((year) => {
      const filtered = filterAllExpensesYear(
        rawIncome,
        rawExpenses,
        rawSavings,
        year
      );
      return filtered.map((entry) => groupAndSum(entry));
    });

    const groupsSet = new Set(grouped.flat(2).map((item) => item.group));
    const finalGroups = Array.from(groupsSet).sort((a, b) =>
      chartDateCompare(a, b)
    );

    const newestFirst = [...currentSelection].sort((a, b) => a - b);

    const charts = currentSelection
      .map((year, index) => {
        const [yearIncome, yearExpenses, yearSavings] = grouped[index];
        const thisYear = new Date(new Date().getFullYear() - year, 0, 1).getFullYear();
        const rank = newestFirst.indexOf(year);

        return [
          createChart(
            `${thisYear} Income`,
            withTransparency("#00a100ff", rank, newestFirst.length),
            yearIncome,
            finalGroups
          ),
          createChart(
            `${thisYear} Expenses`,
            withTransparency("#bb0000ff", rank, newestFirst.length),
            yearExpenses,
            finalGroups
          ),
          createChart(
            `${thisYear} Savings`,
            withTransparency("#ffd000ff", rank, newestFirst.length),
            yearSavings,
            finalGroups
          ),
        ];
      })
      .flat();

    return { charts, groups: finalGroups };
  }, [rawExpenses, rawIncome, rawSavings, currentSelection]);

  return (
    <>
      {availableYears.length >= 2 && (
        <div className={styles.widgetControls}>
          <span className={styles.yearLabel}>Compare</span>
          <NativeSelect.Root size="sm" width="6.5rem">
            <NativeSelect.Field
              value={pair[0]}
              onChange={(e) => selectYear(0, Number(e.target.value))}
            >
              {yearsDescending.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <span className={styles.yearVs}>vs</span>
          <NativeSelect.Root size="sm" width="6.5rem">
            <NativeSelect.Field
              value={pair[1]}
              onChange={(e) => selectYear(1, Number(e.target.value))}
            >
              {yearsDescending.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </div>
      )}
      <YearToDateChartCard charts={charts} groups={groups} />
    </>
  );
}

function SankeyWidget() {
  const [breakdown, setBreakdown] = useState<Breakdown>("GROUPS");
  const filteredExpenses = useFilteredExpenses();
  const filteredIncome = useFilteredIncome();
  const filteredSavings = useFilteredSavings();

  const data = useMemo(
    () =>
      buildCashFlowSankey(
        filteredIncome,
        filteredSavings,
        filteredExpenses,
        breakdown
      ),
    [filteredIncome, filteredSavings, filteredExpenses, breakdown]
  );

  return (
    <SankeyCard
      data={data}
      toolbar={<BreakdownToggle value={breakdown} onChange={setBreakdown} />}
    />
  );
}

export type ChartWidgetDef = {
  type: ChartWidgetType;
  label: string;
  description: string;
  modes?: Mode[];
  defaultMode?: Mode;
  Component: ComponentType<WidgetProps>;
};

export const CHART_WIDGET_DEFS: ChartWidgetDef[] = [
  {
    type: "average-spending",
    label: "Average Monthly Spending",
    description: "Average spend per month by tag or group",
    Component: AverageSpendingWidget,
  },
  {
    type: "income-vs-expenses",
    label: "Income vs Expenses",
    description: "Totals for the selected range",
    Component: IncomeVsExpensesWidget,
  },
  {
    type: "date-grouped",
    label: "Date Grouped Expenses",
    description: "Expenses, income and savings over time",
    modes: Object.values(Mode),
    defaultMode: Mode.MONTHLY,
    Component: DateGroupedWidget,
  },
  {
    type: "tag-stacked",
    label: "Expenses by Tag",
    description: "Stacked spend by tag or group over time",
    modes: Object.values(Mode),
    defaultMode: Mode.MONTHLY,
    Component: TagStackedWidget,
  },
  {
    type: "year-to-date",
    label: "Year To Date",
    description: "Year-over-year cumulative flows",
    Component: YearToDateWidget,
  },
  {
    type: "sankey",
    label: "Cash Flow Sankey",
    description: "Income flowing to expenses and savings",
    Component: SankeyWidget,
  },
];

export const getChartWidgetDef = (type: ChartWidgetType) =>
  CHART_WIDGET_DEFS.find((d) => d.type === type);
