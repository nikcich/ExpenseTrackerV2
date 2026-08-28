import { createStore } from "./generic-store";
import { FilterRule } from "@/utils/custom-filter";

type FilterState = {
  rules: FilterRule[];
};

const store = createStore<FilterState>({
  rules: [],
});

const { useStore: useFilterStore, setState: setFilterStore } = store;

export { useFilterStore };

export const useFilterRules = () => {
  return useFilterStore("rules");
};

export const setFilterRules = (
  rules: FilterRule[] | ((prev: FilterRule[]) => FilterRule[])
) => {
  if (typeof rules === "function") {
    setFilterStore({ rules: rules(store.getState().rules) });
  } else {
    setFilterStore({ rules });
  }
};
