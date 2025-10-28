import { API, Expense, KnownStoreKeys } from "../types/types";
import { createTauriApiHooks, createTauriStoreHook } from "../utils/utils";

export const {
  useTauriValue: useInstantBrushRange,
  useDebouncedTauriValue: useDebouncedBrushRange,
  value$: instantBrushRange$,
} = createTauriApiHooks<[number, number]>(API.DateRange);

export const [useValue, value$] = createTauriStoreHook<number>({
  key: KnownStoreKeys.MyValue,
});

export const [useExpensesStore, expenses$] = createTauriStoreHook<Expense[]>({
  key: KnownStoreKeys.Expenses,
});
