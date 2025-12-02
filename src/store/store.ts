import { API, KnownStoreKeys, StoreExpenseMap } from "../types/types";
import { createTauriApiHooks, createTauriStoreHook } from "../utils/utils";

export const {
  useTauriValue: useInstantBrushRange,
  useDebouncedTauriValue: useDebouncedBrushRange,
  value$: instantBrushRange$,
} = createTauriApiHooks<[number, number]>(API.DateRange);

const [useExpensesStoreInner, expenses$] =
  createTauriStoreHook<StoreExpenseMap>({
    key: KnownStoreKeys.Expenses,
  });

const useExpensesStore = () => {
  const { setValue, value } = useExpensesStoreInner();
  const realValue = value ?? {};

  return {
    value: Object.values(realValue),
    setValue,
  };
};

export { useExpensesStore, expenses$ };
