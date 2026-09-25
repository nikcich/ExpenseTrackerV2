import { createStore } from "./generic-store";
import { Mode } from "@/types/types";

export type ChartWidgetType =
  | "average-spending"
  | "income-vs-expenses"
  | "date-grouped"
  | "tag-stacked"
  | "year-to-date"
  | "sankey";

type ChartsState = {
  modes: Partial<Record<ChartWidgetType, Mode>>;
};

export const { useStore: useChartsStore, setState: setChartsState } =
  createStore<ChartsState>({ modes: {} }, "charts_layout");

export const useChartMode = (type: ChartWidgetType, fallback: Mode) => {
  const modes = useChartsStore("modes");
  return modes[type] ?? fallback;
};

export const setChartMode = (type: ChartWidgetType, mode: Mode) =>
  setChartsState((prev) => ({ modes: { ...prev.modes, [type]: mode } }));