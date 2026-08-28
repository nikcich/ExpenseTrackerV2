import { createStore } from "./generic-store";

type Settings = {
  disabledTags: string[];
  disabledGroups: string[];
  mockDataEnabled: boolean;
  rsuTabEnabled: boolean;
  ssdiTabEnabled: boolean;
  anomalyMultiplier: number;
  anomalyMinOver: number;
  anomalyWindow: number;
  compactAmounts: boolean;
};

export const { useStore: useSettingsStore, setState: setSettingsStore } =
  createStore<Settings>({
    disabledTags: [],
    disabledGroups: [],
    mockDataEnabled: false,
    rsuTabEnabled: false,
    ssdiTabEnabled: false,
    anomalyMultiplier: 1.5,
    anomalyMinOver: 150,
    anomalyWindow: 12,
    compactAmounts: false,
  }, "settings");
