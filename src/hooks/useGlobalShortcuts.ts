import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { enableOverlay, Overlay, useOverlayStore } from "@/store/OverlayStore";
import { Pages } from "@/types/routes";
import { SHORTCUT_COOLDOWN } from "@/utils/utils";

const PAGE_ORDER = [
  Pages.Overview,
  Pages.Accounts,
  Pages.Forecast,
  Pages.TableView,
  Pages.AverageSpending,
  Pages.RangeIncomeExpense,
  Pages.BarChart,
  Pages.StackedBarChart,
  Pages.YTDChart,
  Pages.Sankey,
];

export const useGlobalShortcuts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const visibleOverlay = useOverlayStore("visibleOverlay");
  const lastAction = useRef(0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (Date.now() - lastAction.current < SHORTCUT_COOLDOWN) return;
      lastAction.current = Date.now();

      const modalOpen = visibleOverlay !== undefined;

      if (e.key === "Escape") {
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        enableOverlay(Overlay.HelpModal);
        return;
      }

      if (modalOpen) {
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        const idx = PAGE_ORDER.indexOf(location.pathname as Pages);
        if (idx === -1) {
          navigate(PAGE_ORDER[0]);
        } else {
          const prev = (idx - 1 + PAGE_ORDER.length) % PAGE_ORDER.length;
          navigate(PAGE_ORDER[prev]);
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const idx = PAGE_ORDER.indexOf(location.pathname as Pages);
        if (idx === -1) {
          navigate(PAGE_ORDER[0]);
        } else {
          const next = (idx + 1) % PAGE_ORDER.length;
          navigate(PAGE_ORDER[next]);
        }
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        const num = parseInt(e.key, 10);
        const index = num === 0 ? 9 : num - 1;
        if (index < PAGE_ORDER.length) {
          navigate(PAGE_ORDER[index]);
        }
        return;
      }

      const lower = e.key.toLowerCase();
      if (lower === "n") {
        enableOverlay(Overlay.ManualModal);
        return;
      }

      if (lower === "s") {
        enableOverlay(Overlay.SettingsModal);
        return;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [navigate, location.pathname, visibleOverlay]);
};
