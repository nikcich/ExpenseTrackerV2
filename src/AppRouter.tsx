import {
  BrowserRouter,
  HashRouter,
  Route,
  Routes,
} from "react-router-dom";
import { Pages } from "./types/routes";
import { SideNav } from "./components/SideNav/SideNav";
import styles from "./App.module.scss";
import { JSX, useSyncExternalStore } from "react";
import { mockMode$ } from "./services/ServiceProvider";

import { TableView } from "./pages/TableView/TableView";
import { Charts } from "./pages/Charts/Charts";
import { Overlays } from "./Overlays";
import { Toaster } from "./components/ui/toaster";
import { ErrorBoundary } from "react-error-boundary";
import { Forecast } from "./pages/Forecast/Forecast";
import { Overview } from "./pages/Overview/Overview";
import { Accounts } from "./pages/Accounts/Accounts";
import { RSU } from "./pages/RSU/RSU";
import { Data } from "./pages/Data/Data";
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";
import { SSDI } from "./pages/SSDI/SSDI";
import { SelectionInsights } from "./pages/SelectionInsights/SelectionInsights";
import { Groups } from "./pages/Groups/Groups";
import { Anomalies } from "./pages/Anomalies/Anomalies";
import { ExpenseTrackerServiceProvider } from "./services/ServiceProvider";

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
  useGlobalShortcuts();
  return (
    <div className={styles.routeContainer}>
      <Overlays />
      <Toaster />
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
  const Router = __DEMO_USE_HASH_ROUTER__ ? HashRouter : BrowserRouter;
  return (
    <ExpenseTrackerServiceProvider>
      <Router>
        <Routes>
          <Route
            path={Pages.TableView}
            element={<RouteComponent element={<TableView />} />}
          />

          <Route
            path={Pages.Charts}
            element={<RouteComponent element={<Charts />} />}
          />

          <Route
            path={Pages.Forecast}
            element={<RouteComponent element={<Forecast />} />}
          />

          <Route
            path={Pages.Overview}
            element={<RouteComponent element={<Overview />} />}
          />

          <Route
            path={Pages.Accounts}
            element={<RouteComponent element={<Accounts />} />}
          />

          <Route
            path={Pages.RSU}
            element={<RouteComponent element={<RSU />} />}
          />

          <Route
            path={Pages.Data}
            element={<RouteComponent element={<Data />} />}
          />

          <Route
            path={Pages.SSDI}
            element={<RouteComponent element={<SSDI />} />}
          />

          <Route
            path={Pages.SelectionInsights}
            element={<RouteComponent element={<SelectionInsights />} />}
          />

          <Route
            path={Pages.Groups}
            element={<RouteComponent element={<Groups />} />}
          />

          <Route
            path={`${Pages.Groups}/:groupName`}
            element={<RouteComponent element={<Groups />} />}
          />

          <Route
            path={Pages.Anomalies}
            element={<RouteComponent element={<Anomalies />} />}
          />
        </Routes>
      </Router>
    </ExpenseTrackerServiceProvider>
  );
}
