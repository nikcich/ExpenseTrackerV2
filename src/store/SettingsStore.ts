import { createStore } from "./generic-store";

type Settings = {
  disabledTags: string[];
  mockDataEnabled: boolean;
};

export const { useStore: useSettingsStore, setState: setSettingsStore } =
  createStore<Settings>({
    disabledTags: [],
    mockDataEnabled: false,
  });
