import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Pages } from "./types/routes";
import { SideNav } from "./components/SideNav/SideNav";
import styles from "./App.module.scss";
import { JSX } from "react";
import { Test } from "./pages/Test/Test";
import { Home } from "./pages/Home/Home";
import { TableView } from "./pages/TableView/TableView";
import { GroupedBarChart } from "./pages/GroupedBarChart/GroupedBarChart";
import { TagStackedBarChart } from "./pages/TagStackedBarChart/TagStackedBarChart";
import { Settings } from "./pages/Settings/Settings";
import { FileOpener } from "./pages/FileOpener/FileOpener";
import { Overlays } from "./Overlays";
import { RangeIncomeExpenseChart } from "./pages/RangeIncomeExpenseChart/RangeIncomeExpenseChart";
import { YearToDateChart } from "./pages/YearToDateChart/YearToDateChart";
import { AverageSpending } from "./pages/AverageSpending/AverageSpending";
import { ErrorBoundary } from "react-error-boundary";
import { ExpenseSankey } from "./pages/Sankey/ExpenseSankey";

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
      <div className={styles.content}>
        <ErrorBoundary FallbackComponent={fallbackRender}>
          {element}
        </ErrorBoundary>
      </div>
    </div>
  );
};

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path={Pages.Home}
          element={<RouteComponent element={<Home />} />}
        />

        <Route
          path={Pages.Settings}
          element={<RouteComponent element={<Settings />} />}
        />

        <Route
          path={Pages.Test}
          element={<RouteComponent element={<Test />} />}
        />

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
          path={Pages.FileOpener}
          element={<RouteComponent element={<FileOpener />} />}
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
      </Routes>
    </BrowserRouter>
  );
}
