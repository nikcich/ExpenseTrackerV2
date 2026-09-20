import { createStore } from "./generic-store";
import { Mode } from "@/types/types";

export type ChartWidgetType =
  | "average-spending"
  | "income-vs-expenses"
  | "date-grouped"
  | "tag-stacked"
  | "year-to-date"
  | "sankey";

export type ChartWidgetInstance = {
  id: string;
  type: ChartWidgetType;
  mode?: Mode;
};

type ChartsState = {
  widgets: ChartWidgetInstance[];
};

const DEFAULT_WIDGETS: ChartWidgetInstance[] = [
  { id: "seed-income-vs-expenses", type: "income-vs-expenses" },
  { id: "seed-average-spending", type: "average-spending" },
  { id: "seed-date-grouped", type: "date-grouped", mode: Mode.MONTHLY },
];

export const { useStore: useChartsStore, setState: setChartsState } =
  createStore<ChartsState>({ widgets: DEFAULT_WIDGETS }, "charts_layout");

export const useChartWidgets = () => useChartsStore("widgets");

const makeId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `chart-${Math.random().toString(36).slice(2, 10)}`;

export const addChartWidget = (type: ChartWidgetType, mode?: Mode) => {
  setChartsState((prev) => ({
    widgets: [...prev.widgets, { id: makeId(), type, mode }],
  }));
};

export const removeChartWidget = (id: string) => {
  setChartsState((prev) => ({
    widgets: prev.widgets.filter((w) => w.id !== id),
  }));
};

export const updateChartWidget = (
  id: string,
  patch: Partial<Omit<ChartWidgetInstance, "id" | "type">>
) => {
  setChartsState((prev) => ({
    widgets: prev.widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)),
  }));
};

export const moveChartWidget = (id: string, direction: -1 | 1) => {
  setChartsState((prev) => {
    const index = prev.widgets.findIndex((w) => w.id === id);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= prev.widgets.length) {
      return {};
    }
    const widgets = [...prev.widgets];
    [widgets[index], widgets[target]] = [widgets[target], widgets[index]];
    return { widgets };
  });
};
