import { createStore } from "./generic-store";

type Selection = {
  selection: string[];
};

const store = createStore<Selection>({
  selection: [],
});

const { useStore: useSelectionStore, setState: setSelectionStore } = store;

export const useSelection = () => {
  return useSelectionStore("selection");
};

export const setSelection = (
  selection: string[] | ((prev: string[]) => string[])
) => {
  if (typeof selection === "function") {
    setSelectionStore({ selection: selection(store.getState().selection) });
  } else {
    // Handle the case where selection is an array of strings
    setSelectionStore({ selection });
  }
};
