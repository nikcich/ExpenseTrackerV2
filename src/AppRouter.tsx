import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Pages } from "./types/routes";
import { SideNav } from "./components/SideNav/SideNav";
import { ModelSetup } from "./components/ModelSetup/ModelSetup";
import styles from "./App.module.scss";
import { JSX, useSyncExternalStore } from "react";
import { mockMode$ } from "./utils/utils";

import { TableView } from "./pages/TableView/TableView";
import { GroupedBarChart } from "./pages/GroupedBarChart/GroupedBarChart";
import { TagStackedBarChart } from "./pages/TagStackedBarChart/TagStackedBarChart";
import { Overlays } from "./Overlays";
import { RangeIncomeExpenseChart } from "./pages/RangeIncomeExpenseChart/RangeIncomeExpenseChart";
import { YearToDateChart } from "./pages/YearToDateChart/YearToDateChart";
import { AverageSpending } from "./pages/AverageSpending/AverageSpending";
import { ErrorBoundary } from "react-error-boundary";
import { ExpenseSankey } from "./pages/Sankey/ExpenseSankey";
import { Forecast } from "./pages/Forecast/Forecast";
import { Overview } from "./pages/Overview/Overview";
import { Accounts } from "./pages/Accounts/Accounts";
import { AiTestPage } from "./pages/AiTestPage/AiTestPage";

const MockBanner = () => {
  const enabled = useSyncExternalStore(
    (cb) => { const s = mockMode$.subscribe(cb); return () => s.unsubscribe(); },
    () => mockMode$.getValue(),
  );
  if (!enabled) return null;
  return (
    <div style={{
      background: "#f59e0b",
      color: "#1a1a1a",
      textAlign: "center",
      padding: "0.3rem 1rem",
      fontSize: "0.75rem",
      fontWeight: 600,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      flexShrink: 0,
    }}>
      ⚡ Mock Data Mode — all data is simulated
    </div>
  );
};

function fallbackRender({ error }: { error: Error }) {
  return (
    <div
      role="alert"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "wrap",
        padding: "1rem",
      }}
    >
      <p>Something went wrong:</p>
      <pre style={{ color: "red", textWrap: "wrap" }}>{error.message}</pre>
    </div>
  );
}
const RouteComponent = ({ element }: { element: JSX.Element }) => {
  return (
    <div className={styles.routeContainer}>
      <Overlays />
      <SideNav />
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0, height: "100%" }}>
        <MockBanner />
        <div className={styles.content}>
          <ErrorBoundary FallbackComponent={fallbackRender}>
            {element}
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export function AppRouter() {
  return (
    <BrowserRouter>
      <ModelSetup>
      <Routes>
        <Route
          path={Pages.TableView}
          element={<RouteComponent element={<TableView />} />}
        />

        <Route
          path={Pages.RangeIncomeExpense}
          element={<RouteComponent element={<RangeIncomeExpenseChart />} />}
        />

        <Route
          path={Pages.BarChart}
          element={<RouteComponent element={<GroupedBarChart />} />}
        />

        <Route
          path={Pages.StackedBarChart}
          element={<RouteComponent element={<TagStackedBarChart />} />}
        />

        <Route
          path={Pages.YTDChart}
          element={<RouteComponent element={<YearToDateChart />} />}
        />

        <Route
          path={Pages.AverageSpending}
          element={<RouteComponent element={<AverageSpending />} />}
        />

        <Route
          path={Pages.Sankey}
          element={<RouteComponent element={<ExpenseSankey />} />}
        />

        <Route
          path={Pages.Forecast}
          element={<RouteComponent element={<Forecast />} />}
        />

        <Route
          path={Pages.AiTest}
          element={<RouteComponent element={<AiTestPage />} />}
        />

        <Route
          path={Pages.Overview}
          element={<RouteComponent element={<Overview />} />}
        />

        <Route
          path={Pages.Accounts}
          element={<RouteComponent element={<Accounts />} />}
        />
      </Routes>
      </ModelSetup>
    </BrowserRouter>
  );
}
