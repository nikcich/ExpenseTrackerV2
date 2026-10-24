import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SegmentGroup } from "@chakra-ui/react";
import { GenericPage } from "@/components/GenericPage/GenericPage";
import { MonthPills } from "@/components/MonthPills/MonthPills";
import { ChartCard } from "@/components/charts/ChartCard";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import { BreakdownToggle, type Breakdown } from "@/components/charts/BreakdownToggle";
import type { ChartOpenPayload } from "@/utils/custom-filter";
import { useExpenses, useIncome } from "@/hooks/expenses";
import { useBudgets, useForecastConfig } from "@/store/store";
import { useSettingsStore } from "@/store/SettingsStore";
import { setNavFilter } from "@/store/NavFilterStore";
import { useAllGroups, useAllTags } from "@/utils/tags";
import { getLast12Months } from "@/pages/Overview/utils";
import { computePlanVsActual, UNGROUPED, type PlanRow } from "@/utils/plan-vs-actual";
import type { CashFlowConfig, PayPeriod } from "@/utils/cash-flow-forecast";
import { categoryRule, dateRangeRules, emptyGroupRule } from "@/utils/custom-filter";
import { formatCurrency } from "@/utils/utils";
import { Pages } from "@/types/routes";
import { BudgetEditor } from "./BudgetEditor";
import { ComparisonTable } from "./ComparisonTable";
import styles from "./Budget.module.scss";

type Span = "MONTH" | "YTD";
type View = "CHART" | "TABLE";

const BAR_BUDGET = "Budget";
const BAR_FORECAST = "Forecast";
const BAR_ACTUAL = "Actual";

const pad = (n: number) => String(n).padStart(2, "0");
const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

const monthsInSpan = (selected: Date, span: Span): string[] => {
  if (span === "MONTH") return [monthKey(selected)];
  const keys: string[] = [];
  for (let m = 0; m <= selected.getMonth(); m++) {
    keys.push(monthKey(new Date(selected.getFullYear(), m, 1)));
  }
  return keys;
};

const monthBounds = (months: string[]): { start: string; end: string } => {
  const first = months[0];
  const [y, m] = months[months.length - 1].split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { start: `${first}-01`, end: `${months[months.length - 1]}-${pad(lastDay)}` };
};

export function Budget() {
  const navigate = useNavigate();
  const allExpenses = useExpenses();
  const income = useIncome();
  const { budgets, addBudget, updateBudget, removeBudget } = useBudgets();
  const { config } = useForecastConfig();
  const allTags = useAllTags();
  const allGroups = useAllGroups();
  const disabledTags = useSettingsStore("disabledTags");
  const disabledGroups = useSettingsStore("disabledGroups");

  const monthOptions = useMemo(() => getLast12Months(), []);
  const [selectedIndex, setSelectedIndex] = useState(monthOptions.length - 1);
  const [span, setSpan] = useState<Span>("MONTH");
  const [breakdown, setBreakdown] = useState<Breakdown>("GROUPS");
  const [view, setView] = useState<View>("CHART");
  const [editing, setEditing] = useState(false);

  const expenses = useMemo(
    () =>
      allExpenses.filter(
        (e) =>
          (!disabledTags.some((tag) => e.tags.includes(tag)) || e.tags.length === 0) &&
          (!e.group || !disabledGroups.includes(e.group))
      ),
    [allExpenses, disabledTags, disabledGroups]
  );

  const forecast = useMemo<CashFlowConfig | null>(
    () =>
      config
        ? {
            ...config,
            incomeStreams: (config.incomeStreams ?? []).map((s) => ({
              ...s,
              payPeriod: s.payPeriod as PayPeriod,
            })),
            expenses: (config.expenses ?? []).map((e) => ({
              ...e,
              period: e.period as PayPeriod | undefined,
            })),
          }
        : null,
    [config]
  );

  const months = useMemo(
    () => monthsInSpan(monthOptions[selectedIndex], span),
    [monthOptions, selectedIndex, span]
  );

  const plan = useMemo(
    () => computePlanVsActual({ expenses, income, budgets, forecast, months }),
    [expenses, income, budgets, forecast, months]
  );

  const showForecast = forecast !== null;
  const hasBudgets = budgets.length > 0;

  const bars = useMemo(
    () => [
      ...(hasBudgets ? [BAR_BUDGET] : []),
      ...(showForecast ? [BAR_FORECAST] : []),
      BAR_ACTUAL,
    ],
    [hasBudgets, showForecast]
  );

  const buildTraces = useCallback(
    (rows: PlanRow[]) =>
      rows
        .map((row) => ({
          x: bars,
          y: bars.map((bar) =>
            Math.max(
              0,
              bar === BAR_BUDGET ? row.budget : bar === BAR_FORECAST ? row.forecast : row.actual
            )
          ),
          name: row.category,
          type: "bar" as const,
        }))
        .filter((trace) => trace.y.some((v) => v > 0)),
    [bars]
  );

  const byGroup = breakdown === "GROUPS";
  const rows = byGroup ? plan.groupRows : plan.tagRows;
  const traces = useMemo(() => buildTraces(rows), [buildTraces, rows]);

  const handleOpen = useCallback(
    (row: PlanRow) => {
      const { start, end } = monthBounds(months);
      const isGroup = row.key.startsWith("group:");
      const categoryFilter =
        isGroup && row.category === UNGROUPED
          ? emptyGroupRule()
          : categoryRule(isGroup ? "group" : "tags", row.category);
      setNavFilter([...dateRangeRules(start, end), categoryFilter], `Budget · ${row.category}`);
      navigate(Pages.TableView);
    },
    [months, navigate]
  );

  const handleChartOpen = useCallback(
    (payload: ChartOpenPayload) => {
      if (payload.period !== BAR_ACTUAL || !payload.category) return;
      handleOpen({
        key: `${byGroup ? "group" : "tag"}:${payload.category}`,
        category: payload.category,
        budget: 0,
        forecast: 0,
        actual: 0,
        hasBudget: false,
        hasForecast: false,
      });
    },
    [byGroup, handleOpen]
  );

  const hasGroupBudgets = budgets.some((b) => b.kind === "group");
  const remaining = plan.totals.budget - plan.totals.actual;
  const unbudgetedSpending = plan.groupRows
    .filter((r) => !r.hasBudget)
    .reduce((sum, r) => sum + r.actual, 0);
  const spanLabel = span === "MONTH" ? "this month" : "year to date";

  return (
    <GenericPage title="Budget" hasRange={false} needsData={false}>
      <div className={styles.page}>
        <div className={styles.controls}>
          <SegmentGroup.Root value={span} onValueChange={(e) => setSpan(e.value as Span)}>
            <SegmentGroup.Indicator />
            <SegmentGroup.Items items={[{ value: "MONTH", label: "Month" }, { value: "YTD", label: "Year to date" }]} />
          </SegmentGroup.Root>
          <MonthPills
            months={monthOptions}
            selectedIndex={selectedIndex}
            onChange={setSelectedIndex}
          />
        </div>


        <div className={styles.summaryRow}>
          <div className={styles.summaryCard}>
            <span className={styles.cardLabel}>Budgeted</span>
            <span className={styles.cardValue}>{formatCurrency(plan.totals.budget)}</span>
            <span className={styles.cardSub}>{hasGroupBudgets ? `group budgets, ${spanLabel}` : "no group budgets yet"}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.cardLabel}>Spent</span>
            <span className={styles.cardValue}>{formatCurrency(plan.totals.actual)}</span>
            <span className={styles.cardSub}>
              {hasGroupBudgets && unbudgetedSpending > 0
                ? `${formatCurrency(unbudgetedSpending)} in groups with no budget`
                : spanLabel}
            </span>
          </div>
          {hasGroupBudgets && (
            <div className={styles.summaryCard}>
              <span className={styles.cardLabel}>{remaining >= 0 ? "Remaining" : "Over budget"}</span>
              <span
                className={styles.cardValue}
                style={{ color: remaining >= 0 ? "var(--fg-success)" : "var(--fg-error)" }}
              >
                {formatCurrency(Math.abs(remaining))}
              </span>
              <span className={styles.cardSub}>budgeted minus spent</span>
            </div>
          )}
          {showForecast && (
            <div className={styles.summaryCard}>
              <span className={styles.cardLabel}>Forecast</span>
              <span className={styles.cardValue}>{formatCurrency(plan.totals.forecast)}</span>
              <span className={styles.cardSub}>planned spending</span>
            </div>
          )}
          {showForecast && (
            <div className={styles.summaryCard}>
              <span className={styles.cardLabel}>Income</span>
              <span className={styles.cardValue}>{formatCurrency(plan.income.actual)}</span>
              <span className={styles.cardSub}>forecast {formatCurrency(plan.income.forecast)}</span>
            </div>
          )}
        </div>

        <div className={styles.sectionBar}>
          <SegmentGroup.Root value={view} onValueChange={(e) => setView(e.value as View)}>
            <SegmentGroup.Indicator />
            <SegmentGroup.Items items={[{ value: "CHART", label: "Chart" }, { value: "TABLE", label: "Table" }]} />
          </SegmentGroup.Root>
          <BreakdownToggle value={breakdown} onChange={setBreakdown} />
        </div>

        {view === "CHART" ? (
          <div className={styles.chartPane}>
            {traces.length > 0 ? (
              <ChartCard plain>
                <StackedBarChart
                  data={traces}
                  legendDirection="h"
                  onOpen={handleChartOpen}
                />
              </ChartCard>
            ) : (
              <p className={styles.hint}>Nothing to chart for this period.</p>
            )}
          </div>
        ) : (
          <ComparisonTable
            title={byGroup ? "Groups" : "Tags (line items)"}
            rows={rows}
            showForecast={showForecast}
            onOpen={handleOpen}
          />
        )}

        <div className={styles.toggleRow}>
          <button className={styles.sectionToggle} onClick={() => setEditing((v) => !v)}>
            <span className={`${styles.chevron} ${editing ? styles.chevronOpen : ""}`}>▶</span>
            Edit budgets
          </button>
        </div>

        {editing && (
          <BudgetEditor
            budgets={budgets}
            tagOptions={[...allTags].sort()}
            groupOptions={allGroups}
            onAdd={addBudget}
            onUpdate={updateBudget}
            onRemove={removeBudget}
          />
        )}

        <details className={styles.details}>
          <summary>How this works</summary>
          <p className={styles.hint}>
            The summary is based on group budgets, and all spending counts against them: "Remaining"
            is budgeted minus total spent, so spending in groups with no budget (including ungrouped
            spending) pushes you over. Tag budgets are optional line items matched to each expense's
            first tag and are not part of the summary. Forecast expenses are matched by name to a tag
            or a group, and a name that matches neither still shows up under its own name.
            Double-click a table row, or click an Actual segment, to see its transactions.
          </p>
        </details>
      </div>
    </GenericPage>
  );
}
