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

const RouteComponent = ({ element }: { element: JSX.Element }) => {
  return (
    <div className={styles.routeContainer}>
      <SideNav />
      <div className={styles.content}>{element}</div>
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
      </Routes>
    </BrowserRouter>
  );
}
