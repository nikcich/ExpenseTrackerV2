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
- `ChartCard` — dark card wrapper (var `--bg-panel`, border `--border-color`, border-radius 0.75rem, padding 1.25rem); optional `toolbar` prop renders a right-aligned slot above the chart. `plain` prop strips the chrome (no bg/border/radius/padding) for full-page charts — chart pages use `plain` so the chart renders full-bleed on the page background.
- `BreakdownToggle` — TAGS/GROUPS segmented control (`Breakdown` type); used by tag-based charts to switch aggregation
- `SankeyCard` — accepts `SankeyData`
- `YearToDateChartCard` — accepts `charts` + `groups`
- `GroupedBarChartCard` — accepts `barCharts` + `groups`
- `RangeIncomeExpenseChartCard` — accepts `totalExpenses`/`totalIncome`/`totalSavings`
- `AverageSpendingCard` — accepts `traces` + optional `groupTraces` (toggle shown when provided)
- `TagStackedBarChartCard` — accepts `traces` + optional `groupTraces` (toggle shown when provided)

`CoreTable` (`src/components/DataTable/DataTable.tsx`) is the reusable virtualized expenses table — props: `items: Expense[]`, `selectable?`. It owns selection, sorting, and the quick-wheel radial actions but no search/shell; page components render it inside a `GenericPage`. Used by TableView (with search + type/custom/nav filters), Overview, and InsightsView.

### Styling

- SCSS modules (`.module.scss`). Import as `styles` and use `className={styles.card}`.
- CSS variables: `--bg-panel` (card bg), `--border-color` (card border), `--fg-default` (text). These are defined ONCE in `src/BaseStyles.scss` (`:root`) as aliases to the Chakra semantic tokens (`--chakra-colors-bg-panel` etc.), which are defined in `src/theme.ts` — that file is the single source of truth for all colors. Never hardcode a hex fallback in SCSS; just use `var(--bg-panel)` etc. Use `var(--chakra-colors-border-emphasized)` for the stronger border variant. The full palette is also exposed under raw names (`--bg-base`/`--bg-surface`/`--bg-elevated`/`--bg-overlay`, `--border-subtle`/`--border-default`/`--border-strong`, `--text-primary`/`--text-secondary`/`--text-tertiary`/`--text-disabled`, `--accent-primary(-hover/-muted)`, status `--success`/`--warning`/`--error`/`--info` + `-muted`, and `--shadow-elevation-low/high`) — all aliased to the Chakra tokens except the shadows, which are raw values in BaseStyles.
- Consistent card pattern: background `var(--bg-panel)`, border `1px solid var(--border-color)`, border-radius `0.75rem`, padding `1.25rem`.
- Don't nest cards: inner stat groups (RSU/account/balance tiles inside a card) render flat — labels + values with grid/gap only, no `--bg-panel`/border/radius. Only top-level KPI tiles and interactive widgets get the box. Full-page charts use `ChartCard plain`.
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

- All backend/API access is decoupled behind the **`ExpenseTrackerService`** interface (`src/services/ExpenseTrackerService.ts`) — Tauri-agnostic. The Tauri implementation is the only place that imports `@tauri-apps/*`: `TauriService` (`src/services/TauriService.ts`, uses `invoke` + `listen` + dialog/opener plugins). A non-Tauri backend (e.g. HTTP container) would implement the same interface and be passed to the provider.
- `ExpenseTrackerServiceProvider` (`src/services/ServiceProvider.tsx`) wraps `AppRouter` and provides the active service via context. Components/hooks call `useExpenseTrackerService()`. The module-scope store polling layer (can't use React context) reads `getActiveService()` / subscribes to `activeService$` (a `BehaviorSubject`) — same pattern as `mockMode$`. Switching the provider's service triggers an immediate re-fetch of all stores.
- Expenses are stored in Tauri's `tauri-plugin-store` (key `"expenses"`), polled every 2s via `createStoreHook` (renamed from `createTauriStoreHook`).
- Custom RxJS store in `src/store/generic-store.ts` using `BehaviorSubject`. Provides `setState`, `getState`, and a React `useStore(key)` hook. `SettingsStore` (`"settings"`) and `ChartsStore` (`"charts_layout"`) pass a `persistKey`; they hydrate/persist through `getActiveService()` on service change. Other stores (e.g. `NavFilterStore`, `FilterStore`, selection) are in-memory only.
- Hooks in `src/hooks/expenses.ts`: `useExpenses()`, `useFilteredExpenses()`, `useIncome()`, `useFilteredIncome()`, `useSavings()`, `useFilteredSavings()`, `useGetExpenseById()`, `useDateExtents()`.
- Date range: D3 brush scrubber (`BrushScrubber`), held locally in a `BehaviorSubject` (`instantBrushRange$` in `src/store/store.ts`, no Tauri/backend sync). Consumed via `useDebouncedBrushRange()` from `src/store/store.ts`.
- Tags: `src/utils/tags.ts` exports `useAllTags()` (collects unique tags from all expenses/savings/income + ALL_TAGS enum, reference-stable), `useAllTagsOptions()` (for dropdowns).
- Disabled tags filter: `useDisabledTags()` from `src/store/SettingsStore.ts`. Overview page respects disabled tags when computing chart data.

### Service Layer

- **`ExpenseTrackerService`** interface methods: `getStoreValue`/`setStoreValue`/`onStoreChanged` (the `"store-changed"` event is Tauri-specific; a different backend maps its own change notification here), expense CRUD (`addExpenseManual`, `updateExpense`, `updateBulkExpenses`, `removeExpense`, `removeBulkExpenses`), CSV (`openCsvFromPath`, `parseCsvFromPath`, `saveCsvToPath`, `readTextFile`, `readCsvPreview`, `previewCsvParse`), backup (`exportAllData`, `importAllData`), dialogs (`openFileDialog`, `saveFileDialog`), `revealItemInDir`, `getAppVersion` (`plugin:app|version`), `checkForUpdates`/`installUpdate` (the Tauri updater plugin; `MockService` always reports up-to-date and throws on install).
- All methods keep the `Response<T>` envelope (`{ status, header, message }`) so call sites do `res.status >= 400` checks — HTTP-like, backend-agnostic.
- Store keys, Tauri command strings, and the import-date/export/import shapes are centralized in `src/types/types.ts` (`API` enum, `KnownStoreKeys`, `Response<T>`).
- To add a new backend: implement `ExpenseTrackerService` and mount `<ExpenseTrackerServiceProvider service={myBackend}>`. If it uses polling/change-notification, `activeService$` handles the store layer re-fetch.
- `MockService` (`src/services/MockService.ts`) is a second implementation — an in-memory store seeded from `createMockData()`, used for demo/screenshot mode. See "Mock Data System".

### Pages

Page components live in `src/pages/`, each in its own directory. All use `<GenericPage>` as the page shell.

**GenericPage props**: `title: string`, `actions?: JSX.Element` (rendered in header next to title), `children`, `footer?: JSX.Element` (bottom slot, typically `<BrushScrubber />`), `hasRange?: boolean` (default true, shows date range in subtitle), `needsData?: boolean` (default true, shows empty state when no data), `scrollSnap?: boolean` (default false, applies `scroll-snap-type: y proximity` to the scrolling children container). GenericPage internally calls `useHasDisplayData()` to decide whether to show children or an empty state. It also reads `useDebouncedBrushRange()` for the date range subtitle.

Pages breakdown:
- **Overview** (`/overview`) — Most complex page. Dashboard layout with SummaryCards (4 cards: income, spending, net, savings — each with value, prev, YTD, Delta), DonutChart (spending by tag, with disabled tag filter support), MonthPills (12-month navigation), NetSparkline (trend), InvestmentsCard (RSU + assets − debts net worth). Uses `computeMonthData` and `computeYtdFromExpenses` utils from `./utils.ts`.
- **Home** (`/`) — Landing page, simple layout.
- **Investments** (`/investments`) — RSU vest tracking and balance snapshots (assets/debts). Card-based layout.
- **TableView** (`/table-view`) — Full data table with virtualized rows (`@tanstack/react-virtual`), filter toggles (Expenses/Income/Savings). Bulk edit/delete via SelectionStore. Sortable columns.
- **Data** (`/data`) — Single home for all data I/O, styled with CSS modules (no Chakra). Three concerns: **CSV Import** (select file → pick a format → parse; appends an import date to `importHistory`, consumed by `BrushScrubber` markers), **Export & Backup** (expenses → CSV via `downloadExpensesCSV`, full-dataset JSON backup via `exportAllData`/`importAllData`), and the **CSV Format Designer** (preview a CSV, build/edit `DynamicCsvDefinition`s, run a parse preview). The `i` global shortcut navigates here with `{ csvImport: true }`, which auto-opens the file picker.
- **Forecast** (`/forecast`) — Cash flow forecast using `computeCashFlowForecast()`. Fully CSS-module-styled (no Chakra UI components), uses custom form field pattern with `.field`/`.fieldLabel`/`.fieldInput` classes.
- **Charts** (`/charts`) — The single home for chart visualizations; it replaced the old per-chart pages (Sankey, YearToDateChart, GroupedBarChart, RangeIncomeExpenseChart, AverageSpending, TagStackedBarChart), which have been removed. Single-column scrolling list of user-managed full-width tiles driven by `ChartsStore` (persisted under `charts_layout`); each tile body is 70vh tall and tiles snap on scroll (`scrollSnap` prop on `GenericPage`). Each tile = header (label + optional MONTHLY/DAILY/YEARLY toggle + move up/down + remove). A full-width "Add Chart" button sits after the last tile and appends new tiles; its menu only lists chart types not already on the dashboard (hidden once every type is present). Widget definitions live in `src/pages/Charts/widgets.tsx` (`CHART_WIDGET_DEFS`): each entry has `type`, `label`, optional `modes`, and a `Component({ instance })` that calls data hooks, transforms data, and renders the still-shared props-driven chart cards (`src/components/charts/`) with `ChartCard plain`. `sankey-flow` and `year-to-date` pure logic lives in `src/utils/` and is used by the widgets. Tiles are boxed (`--bg-panel`/border) even though the nested cards are `plain`.

### Modals

Rendered via `OverlayStore` enum + `GenericModal` pattern in `src/Overlays.tsx`. All modals are mounted simultaneously; each reads `useActiveOverlay()` to self-select visibility. Overlays: `DateRangeModal`, `EditModal`, `ManualModal` (CreateExpenseModal), `TagModal`, `SettingsModal`.

- `GenericModal` — Shows semi-transparent backdrop with blur, centers a Chakra `Box`. Reads overlay state via `useActiveOverlay()`.
- `SettingsModal` — Settings content (disabled tags, config) wrapped in GenericModal. Settings is NOT a page route — it's opened from the SideNav gear icon.

### Side Navigation

`SideNav.tsx` renders a vertical icon rail at the left edge with a collapse/expand toggle (shows labels when expanded; `navExpanded` setting in `SettingsStore`). The scrollable item region (`navItems`) sits between up/down chevron buttons that page it on click (no visible scrollbar; disabled chevrons dim when at a bound); Settings/Collapse stay fixed at the bottom. Sections, icons, labels, and keyboard order all come from `src/types/nav.ts` (`NAV_SECTIONS`) — the single source of truth. `NAV_PAGE_ORDER` (non-conditional pages, in nav order) drives the ArrowUp/Down and `1-9,0` jump shortcuts in `useGlobalShortcuts`, so keyboard order always matches the visual rail. RSU/SSDI items are conditional (hidden unless `rsuTabEnabled`/`ssdiTabEnabled` or data exists). Settings button opens the SettingsModal overlay (not a route). No Import CSV button in sidebar.

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
- `MockService` (`src/services/MockService.ts`) is an `ExpenseTrackerService` backed by an in-memory store seeded from `createMockData()`. It returns fake data from `getStoreValue`, and its writes mutate the in-memory store and emit its own store-change events (so all pollers refresh).
- `mockMode$` / `setMockMode(enabled)` live in `src/services/ServiceProvider.tsx` and are the single source of truth.
- `ExpenseTrackerServiceProvider` subscribes to `mockMode$`. When it flips on, the active service (both the context value and `activeService$`) becomes a fresh `MockService`; when off, it reverts to the real service. A new `MockService` instance (fresh data) is created each time mock mode is enabled.
- Because the swap routes through `activeService$`, every store poller re-fetches immediately on toggle — no per-hook mock awareness anywhere.

**Settings and edits in mock mode:** `setValue` in store hooks and `SettingsStore` persistence just call the active service. In mock mode that's `MockService`, so settings and expense edits are held in memory (not persisted) but fully interactive — edit/bulk/tag/delete operations work against the mock store.

**Adding mock data for a new store:**
1. Write a generator function in `src/types/mockExpenses.ts` (takes `startDate`/`endDate` params, no module constants)
2. Add it to the `createMockData()` factory (in `mockExpenses.ts`), which returns a `MockDataMap` keyed by `KnownStoreKeys.*`
3. Rebuild and enable mock mode — no store/poller changes needed. The store hook's `getStoreValue` picks it up automatically.

**Important:** Always derive dates from `startDate` (12 months ago) and `endDate` (today) passed into the generator. Never hardcode dates. `MOCK_DATA_MAP` (a module-load snapshot) is still exported for the demo shims.

**Demo deployment:** `src/demo/main.demo.tsx` calls `setMockMode(true)` before rendering, so the demo build runs entirely on `MockService`. The `@tauri-apps/*` imports in `TauriService` are aliased to `src/demo/shim-*` in `vite.demo.config.ts` (never actually used for data while mock is on).

**MockBanner:** A yellow banner at the top of every page (in `AppRouter.tsx`) shows "⚡ Mock Data Mode — all data is simulated" when mock mode is active. Uses `useSyncExternalStore` to react to `mockMode$` changes.

**Files involved:**
- `src/services/MockService.ts` — in-memory `ExpenseTrackerService` implementation
- `src/services/ServiceProvider.tsx` — `mockMode$`, `setMockMode()`, service swap
- `src/types/mockExpenses.ts` — all mock generators + `createMockData()` factory
- `src/store/SettingsStore.ts` — `mockDataEnabled` boolean
- `src/pages/Settings/SettingsModal.tsx` — Toggle switch + `setMockMode()` call
- `src/AppRouter.tsx` — `MockBanner` component
- `src/demo/main.demo.tsx` — `setMockMode(true)` on boot

### Key Utilities

- `src/utils/expense-utils.ts`: `groupAndSumExpenses(expenses, ...keyFns)`, `byMonth`, `byYear`, `byDay`, `byTag`
- `src/utils/utils.ts`: `chartDateCompare(a, b)` — sorts date-group strings, `parseDate()` — date-fns parser, `createStoreHook<T>()` — polling-based store hooks
- `src/utils/cash-flow-forecast.ts`: `computeCashFlowForecast()` — forecast engine (daily cash flow events from config)
- `src/utils/download.ts`: `downloadExpensesCSV()` — exports expenses to CSV blob; `exportAllData()` / `importAllData()` — full-dataset JSON backup/restore (surfaced on the Data page)
- `src/hooks/useElementSize.ts`: `useElementSize(ref, delay = 90)` — ResizeObserver-backed element size. Coalesces bursts to at most one commit per `delay` ms (plus a trailing commit) and skips no-op/rounded-equal sizes, so chart SVGs don't re-render on every frame of a layout animation (e.g. SideNav expand). Used by `BarChart`, `LineChart`, `StackedBarChart`, and `Sankey`.
- `src/types/mockExpenses.ts`: All mock data generators for the mock system (expenses, RSU, snapshots, forecast config, brush range) and `createMockData()` factory

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

The Tauri backend lives in `src-tauri/`. Key commands registered: store CRUD (`store_set_json_value`, `store_get_json_value`), CSV operations (`open_csv_from_path`, `parse_csv_from_path`), expense CRUD (`update_expense`, `update_bulk_expenses`, `add_expense_manual`, `remove_expense`, `remove_bulk_expenses`). Expenses stored in local JSON via `tauri-plugin-store`.

### Auto-Updates & Releases

- Auto-update uses `tauri-plugin-updater` + `tauri-plugin-process`, configured in `src-tauri/tauri.conf.json` under `plugins.updater` (`pubkey`, GitHub releases `latest.json` endpoint, `installMode: passive`). The bundle sets `createUpdaterArtifacts: true`.
- Signing key lives OUTSIDE the repo: `~/.tauri/expense-tracker-v2.key` (+ password in `expense-tracker-v2.key-password`). The pubkey is embedded in `tauri.conf.json`. GitHub secrets needed for CI: `TAURI_SIGNING_PRIVATE_KEY` (file contents) + `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
- `.github/workflows/release.yml` builds on `rel-*` branches (matrix: ubuntu appimage/deb, windows nsis/msi, macos dmg/app), extracts the version from the branch name, syncs Tauri/Cargo versions, and publishes with `uploadUpdaterJson: true`.
- The `.opencode/command/release.md` slash command (`/release [major|minor|fix]`) bumps the three version files and pushes a `rel-[version]` branch to trigger a release; CI creates the tagged GitHub release.

### Routing

React Router v7 with `BrowserRouter`. RouteComponent wraps each page with `<Overlays /> + <SideNav /> + <ErrorBoundary>`. Routes are defined via the `Pages` enum (Settings and FileOpener were removed — Settings is a modal, the old FileOpener/CSV-formats page was consolidated into the Data page; the per-chart pages were consolidated into the Charts dashboard).
