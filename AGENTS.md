# expense_tracker_v2

Tauri v2 + React 19 + TypeScript + Vite 7 desktop app for personal expense tracking. Charts via Plotly.js (react-plotly.js), UI via Chakra UI v3. State via RxJS BehaviorSubjects. Styling via SCSS modules.

## Commands

- `npm run dev` — dev server with hot reload
- `npm run build` — typecheck (`tsc`) then bundle (`vite build`). Run this before committing.
- `npm run tauri` — Tauri CLI passthrough

## Code Standards

- **Strict TypeScript**: `noUnusedLocals` and `noUnusedParameters` are on. Remove unused imports/vars. Use explicit types at module boundaries; inference is fine internally.
- **No comments** in code unless the intent cannot be expressed clearly in the code itself.
- **Path aliases**: `@/*` maps to `src/*`. Always use `@/` imports (e.g. `@/components/GenericPage/GenericPage`, `@/types/types`, `@/hooks/expenses`).

## Architecture & Conventions

### Reusable data-prop-driven components

Components must accept data via props — never call hooks or fetch data internally. This lets them be reused with differently filtered data. The pattern is:

- Page component: calls hooks, transforms data, passes as props
- Card/chart component: pure rendering from props

Existing reusable card components in `src/components/charts/`:
- `ChartCard` — dark card wrapper (var `--bg-panel`, border `--border-color`, border-radius 0.75rem, padding 1.25rem); optional `toolbar` prop renders a right-aligned slot above the chart
- `BreakdownToggle` — TAGS/GROUPS segmented control (`Breakdown` type); used by tag-based charts to switch aggregation
- `SankeyCard` — accepts `SankeyData`
- `YearToDateChartCard` — accepts `charts` + `groups`
- `GroupedBarChartCard` — accepts `barCharts` + `groups`
- `RangeIncomeExpenseChartCard` — accepts `totalExpenses`/`totalIncome`/`totalSavings`
- `AverageSpendingCard` — accepts `traces` + optional `groupTraces` (toggle shown when provided)
- `TagStackedBarChartCard` — accepts `traces` + optional `groupTraces` (toggle shown when provided)

### Styling

- SCSS modules (`.module.scss`). Import as `styles` and use `className={styles.card}`.
- CSS variables: `--bg-panel` (card bg), `--border-color` (card border), `--fg-default` (text).
- Consistent card pattern: background `var(--bg-panel, #19191e)`, border `1px solid var(--border-color, #32323c)`, border-radius `0.75rem`, padding `1.25rem`.
- Form fields follow `.field` > `.fieldLabel` + `.fieldInput` pattern.
- When styling tables, `.table td` has higher specificity than a standalone class like `.eventIncome`, so set base color on `.table` (inherited) rather than on `.table td` directly.
- Card header pattern: `.cardHeader` (flex, space-between, align-center, mb: 1rem), `.cardTitle` (0.95rem, 600 weight).

### Charts

- `BarChart` — props: `x`, `barCharts: [{name, y, color}]`, `horizontal`, `legend`, `legendDirection`
- `LineChart` — same props as BarChart (renders scatter+lines)
- `StackedBarChart` — props: `data` (Plotly traces), `legend`, `legendDirection`. Also exports `parseStackedFormat()` utility.
- `Sankey` — props: `data: SankeyData`. Exports `SankeyNode`, `SankeyLink`, `SankeyData` types.
- Chart wrapper components add card styling around the chart + forward chart-specific props (legend, legendDirection).

### Data Flow

- Expenses are stored in Tauri's `tauri-plugin-store` (key `"expenses"`), polled every 2s via `createTauriStoreHook`.
- Custom RxJS store in `src/store/generic-store.ts` using `BehaviorSubject`. Provides `setState`, `getState`, and a React `useStore(key)` hook.
- Hooks in `src/hooks/expenses.ts`: `useExpenses()`, `useFilteredExpenses()`, `useIncome()`, `useFilteredIncome()`, `useSavings()`, `useFilteredSavings()`, `useGetExpenseById()`, `useDateExtents()`.
- Date range: D3 brush scrubber (`BrushScrubber`), synced via Tauri events (`set_date_range`, `get_date_range`). Consumed via `useDebouncedBrushRange()` from `src/store/store.ts`.
- Tags: `src/utils/tags.ts` exports `useAllTags()` (collects unique tags from all expenses/savings/income + ALL_TAGS enum, reference-stable), `useAllTagsOptions()` (for dropdowns).
- Disabled tags filter: `useDisabledTags()` from `src/store/SettingsStore.ts`. Overview page respects disabled tags when computing chart data.

### Pages

12 page components in `src/pages/`, each in its own directory. All use `<GenericPage>` as the page shell.

**GenericPage props**: `title: string`, `actions?: JSX.Element` (rendered in header next to title), `children`, `footer?: JSX.Element` (bottom slot, typically `<BrushScrubber />`), `hasRange?: boolean` (default true, shows date range in subtitle), `needsData?: boolean` (default true, shows empty state when no data). GenericPage internally calls `useHasDisplayData()` to decide whether to show children or an empty state. It also reads `useDebouncedBrushRange()` for the date range subtitle.

Pages breakdown:
- **Overview** (`/overview`) — Most complex page. Dashboard layout with SummaryCards (4 cards: income, spending, net, savings — each with value, prev, YTD, Delta), DonutChart (spending by tag, with disabled tag filter support), MonthPills (12-month navigation), NetSparkline (trend), InvestmentsCard (RSU + assets − debts net worth). Uses `computeMonthData` and `computeYtdFromExpenses` utils from `./utils.ts`.
- **Home** (`/`) — Landing page, simple layout.
- **Investments** (`/investments`) — RSU vest tracking and balance snapshots (assets/debts). Card-based layout.
- **TableView** (`/table-view`) — Full data table with virtualized rows (`@tanstack/react-virtual`), filter toggles (Expenses/Income/Savings), CSV import card at top. Bulk edit/delete via SelectionStore. CSV download utility. Sortable columns.
- **Forecast** (`/forecast`) — Cash flow forecast using `computeCashFlowForecast()`. Fully CSS-module-styled (no Chakra UI components), uses custom form field pattern with `.field`/`.fieldLabel`/`.fieldInput` classes.
- **Chart pages** (Sankey, YearToDateChart, GroupedBarChart, RangeIncomeExpenseChart, AverageSpending, TagStackedBarChart) — Each renders a `<GenericPage>` shell, calls data hooks, transforms data, and passes to the corresponding card component. All use the same `div style={{ padding: "1.5rem 2rem", height: "100%", display: "flex", flexDirection: "column" }}` outer container. Uses `<BrushScrubber />` as footer for range filtering. Some use `<SegmentGroup.Root>` in actions for mode switching (MONTHLY/DAILY/YEARLY).

### Modals

Rendered via `OverlayStore` enum + `GenericModal` pattern in `src/Overlays.tsx`. All modals are mounted simultaneously; each reads `useActiveOverlay()` to self-select visibility. Overlays: `DateRangeModal`, `EditModal`, `ManualModal` (CreateExpenseModal), `TagModal`, `SettingsModal`.

- `GenericModal` — Shows semi-transparent backdrop with blur, centers a Chakra `Box`. Reads overlay state via `useActiveOverlay()`.
- `SettingsModal` — Settings content (disabled tags, config) wrapped in GenericModal. Settings is NOT a page route — it's opened from the SideNav gear icon.

### Side Navigation

`SideNav.tsx` renders a vertical icon bar at the left edge. Contains icon buttons for all routes defined in `Pages` enum (Home, Overview, Investments, TableView, BarChart, StackedBarChart, RangeIncomeExpense, YTDChart, AverageSpending, Sankey, Forecast). Settings button opens the SettingsModal overlay (not a route). No Import CSV button in sidebar.

### Expense Data Model

```
Expense { id: string; amount: number; tags: Tag[]; group?: string; date: string; description: string }
Tag = ExpenseTag | NonExpenseTags | string
ExpenseTag enum: Food, Utilities, Rent/Mortgage, Transportation, Entertainment, Health/Med, Shopping, Debt, Gifts, Misc, Motorcycle, Work, Gas, One_Off, Insurance, Credit_Repayment, Vacation/Travel
NonExpenseTags: Income, Savings (legacy — no longer offered in tag pickers)
Mode enum: MONTHLY, DAILY, YEARLY
```

**Groups** are a second, orthogonal dimension on top of tags: tags = *what* the money was (Food, Gas), `group` = *what it was part of* (e.g. "Japan Trip", "Bathroom Reno"). An expense belongs to at most one group (free-form string, no enum). The Rust `Expense` struct (`src-tauri/src/model/expense.rs`) mirrors this with `Option<String>` + `#[serde(default)]`, so old stored data without the field deserializes fine. Key pieces:
- `useAllGroups()` in `src/utils/tags.ts` — collects distinct groups from all entries (sorted, reference-stable)
- Bulk assignment: select rows in TableView → "Set Group" → `GroupModal` (Overlay enum) → `UpdateBulkExpenses`
- Per-expense field in `ExpenseForm` (text input with datalist of existing groups)
- `disabledGroups` in SettingsStore — same pattern as `disabledTags`; toggleable per-group in Settings modal when groups exist. Consumed everywhere `disabledTags` is: Overview page filter and `useFilteredExpenses()` (chart pages) — entries whose `group` is disabled are excluded.
- **Groups page** (`/groups`) — grid of group cards (single signed total: positive red = spent, negative green = net reimbursement; reserved Income/Savings groups labeled accordingly) → click through to `/groups/:groupName` detail. Both list and detail render via the shared `InsightsView` component (`src/components/InsightsView/`), which is props-driven (takes `items: Expense[]`, plus `variant?: "selection" | "group"` — group variant shows one signed-total stat instead of the Spent/Income/Net/Savings cards, since non-reserved groups can never contain income/savings entries). SelectionInsights page reuses the same `InsightsView` with the default selection variant. Group detail has Rename (inline editor, bulk-updates all items via `UpdateBulkExpenses`, navigates to new name) and Clear Group (two-click confirm, removes group from all items) actions — hidden for reserved Income/Savings groups since reassigning those entries would reclassify them.
- Mock data: mock expenses include a "Japan Trip" and "Bathroom Reno" group

Note: "Retirement" was removed from NonExpenseTags and is now treated as a normal expense tag. The `useRetirement`/`useFilteredRetirement` hooks were removed.

### Classification (Income / Savings / Expense)

Classification is **group-based**, with a legacy tag fallback so old stored data keeps working:

- `getExpenseKind(e)` in `src/utils/expense-utils.ts` is the single source of truth: returns `"income"` if `e.group === INCOME_GROUP` (or legacy fallback `tags.includes("Income")`), `"savings"` if `e.group === SAVINGS_GROUP` (or legacy `tags.includes("Savings")`), else `"expense"`. Priority: income before savings.
- Constants: `INCOME_GROUP = "Income"`, `SAVINGS_GROUP = "Savings"` (from `NonExpenseTags`) in `src/utils/expense-utils.ts`.
- All classification consumers route through it: `useExpenses()` (expense-kind only), `useIncome()`, `useSavings()`, Overview utils (`computeMonthData` etc.), Groups page summaries, InsightsView, TableView type filters, DataTable chip coloring (group chip green/yellow/purple by kind).
- Income/savings entries can carry real tags now (e.g. "Paycheck"). To create/reclassify entries, set group to "Income"/"Savings" — via ExpenseForm or TableView "Set Group" bulk action; both modals show a "Will be classified as…" hint when the reserved name is typed (deliberate, not blocked).
- `ALL_TAGS` no longer includes `NonExpenseTags`, and `ExpenseForm`/`TagModal` call `useAllTagsOptions()` without the flag, so pickers never offer the pseudo-tags. `useQuickTag` also skips them. Legacy tags on stored data are still honored by the fallback.

### Mock Data System

A global mock mode exists for screenshots/demos. When enabled via Settings modal, **all data** is replaced with fake data at the lowest possible layer — no page/hook-level mock awareness needed.

**How it works:**
- `mockMode$` (a `BehaviorSubject<boolean>`) in `src/utils/utils.ts` is the single source of truth
- `setMockMode(enabled)` toggles it. Settings modal calls this when the switch is flipped.
- `createTauriPoller` (used by `createTauriStoreHook` for expenses, RSU, snapshots, forecast config) accepts an optional `mockData` param. Inside, it checks `mockMode$.getValue()` before deciding to return mock data or call Tauri `invoke`.
- `createTauriApiHooks` (used for brush range) has the same pattern.
- Both poller and API hooks subscribe to `mockMode$` (via `merge` / `.subscribe`) so toggling mock mode triggers an **immediate re-fetch** rather than waiting for the next poll interval.

**Write protection:** When mock mode is on, every setter (`setValue` in store hooks, `updateDateRange` in RustInterfaceHandlers) checks `mockMode$.getValue()` and returns early without calling Tauri `invoke`. Local state is still updated for UI responsiveness, but nothing is persisted.

**Adding mock data for a new store/hook:**
1. Add a generator function in `src/types/mockExpenses.ts`
2. Create a module-level `MOCK_*` constant calling the generator with `startDate`/`endDate`
3. Add an entry to `MOCK_DATA_MAP` keyed by `KnownStoreKeys.*`
4. Pass `mockData: MOCK_DATA_MAP[KnownStoreKeys.*]` to the `createTauriStoreHook` or `createTauriApiHooks` call in `src/store/store.ts`

**Important:** Always use `startDate` (12 months ago) and `endDate` (today) for dynamic date ranges. Never hardcode dates in mock data generators.

**MockBanner:** A yellow banner at the top of every page (in `AppRouter.tsx`) shows "⚡ Mock Data Mode — all data is simulated" when mock mode is active. Uses `useSyncExternalStore` to react to `mockMode$` changes.

**Files involved:**
- `src/types/mockExpenses.ts` — All mock generators and `MOCK_DATA_MAP`
- `src/utils/utils.ts` — `mockMode$`, `setMockMode()`, mock-aware pollers/setters
- `src/store/store.ts` — Each `createTauriStoreHook` passes `mockData`
- `src/store/RustInterfaceHandlers.ts` — `updateDateRange` skips invoke in mock mode
- `src/store/SettingsStore.ts` — `mockDataEnabled` boolean
- `src/pages/Settings/SettingsModal.tsx` — Toggle switch + `setMockMode()` call
- `src/AppRouter.tsx` — `MockBanner` component

### Key Utilities

- `src/utils/expense-utils.ts`: `groupAndSumExpenses(expenses, ...keyFns)`, `byMonth`, `byYear`, `byDay`, `byTag`
- `src/utils/utils.ts`: `chartDateCompare(a, b)` — sorts date-group strings, `parseDate()` — date-fns parser, `createTauriApiHooks<T>()` — creates BehaviorSubject-backed hooks for Tauri commands, `createTauriStoreHook<T>()` — polling-based store hooks
- `src/utils/cash-flow-forecast.ts`: `computeCashFlowForecast()` — forecast engine (daily cash flow events from config)
- `src/utils/download.ts`: `downloadExpensesCSV()` — exports expenses to CSV blob
- `src/types/mockExpenses.ts`: All mock data generators for the mock system (expenses, RSU, snapshots, forecast config, brush range) and `MOCK_DATA_MAP`

### Segment Controls

Use Chakra UI's `<SegmentGroup.Root>` for mode toggle buttons (e.g. MONTHLY/DAILY/YEARLY). Pattern:
```tsx
<SegmentGroup.Root value={mode} onValueChange={(e) => setMode(e.value as Mode)}>
  <SegmentGroup.Indicator />
  <SegmentGroup.Items items={Object.values(Mode)} />
</SegmentGroup.Root>
```

### Error Handling

Each page route is wrapped in `<ErrorBoundary>` from `react-error-boundary` in `AppRouter.tsx`.

### Rust Backend

The Tauri backend lives in `src-tauri/`. Key commands registered: store CRUD (`store_set_json_value`, `store_get_json_value`), window management (`new_window`), date range (`set_date_range`, `get_date_range`), CSV operations (`open_csv_from_path`, `parse_csv_from_path`), expense CRUD (`update_expense`, `update_bulk_expenses`, `add_expense_manual`, `remove_expense`, `remove_bulk_expenses`). Expenses stored in local JSON via `tauri-plugin-store`.

### Routing

React Router v7 with `BrowserRouter`. RouteComponent wraps each page with `<Overlays /> + <SideNav /> + <ErrorBoundary>`. 11 routes defined via `Pages` enum (Settings and FileOpener were removed — Settings is a modal, FileOpener was merged into TableView).
