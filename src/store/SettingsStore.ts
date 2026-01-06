import { ALL_EXPENSE_TAGS, NonExpenseTags, Tag } from "@/types/types";
import { createStore } from "./generic-store";

type Settings = {
  enabledTags: Tag[];
};

export const { useStore: useSettingsStore, setState: setSettingsStore } =
  createStore<Settings>({
    enabledTags: [...ALL_EXPENSE_TAGS, NonExpenseTags.RSU],
  });
