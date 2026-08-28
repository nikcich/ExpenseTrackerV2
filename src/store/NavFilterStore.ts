import { createStore } from "./generic-store";
import { FilterRule } from "@/utils/custom-filter";

export type NavFilter = {
  rules: FilterRule[];
  source: string;
};

type NavFilterState = {
  navFilter: NavFilter | null;
};

const store = createStore<NavFilterState>({
  navFilter: null,
});

const { useStore, setState } = store;

export const useNavFilter = () => useStore("navFilter");

export const setNavFilter = (rules: FilterRule[], source: string) => {
  setState({ navFilter: { rules, source } });
};

export const clearNavFilter = () => {
  setState({ navFilter: null });
};
