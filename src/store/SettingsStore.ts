import { createStore } from "./generic-store";

type Settings = {
  // enabledTags: Tag[];
  disabledTags: string[];
};

export const { useStore: useSettingsStore, setState: setSettingsStore } =
  createStore<Settings>({
    disabledTags: [],
  });
