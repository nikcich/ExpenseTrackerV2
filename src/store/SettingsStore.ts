import { createStore } from "./generic-store";

type Settings = {
  disabledTags: string[];
  disabledGroups: string[];
  mockDataEnabled: boolean;
  rsuTabEnabled: boolean;
  ssdiTabEnabled: boolean;
};

export const { useStore: useSettingsStore, setState: setSettingsStore } =
  createStore<Settings>({
    disabledTags: [],
    disabledGroups: [],
    mockDataEnabled: false,
    rsuTabEnabled: false,
    ssdiTabEnabled: false,
  }, "settings");
