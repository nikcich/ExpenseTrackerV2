import { ForecastConfigData, KnownStoreKeys, StoreExpenseMap } from "../types/types";
import { createTauriApiHooks, createTauriStoreHook } from "../utils/utils";
import { useEffect, useState } from "react";

export const {
  useTauriValue: useInstantBrushRange,
  useDebouncedTauriValue: useDebouncedBrushRange,
  value$: instantBrushRange$,
} = createTauriApiHooks<[number, number]>("get_date_range");

const [useExpensesStoreInner, expenses$] =
  createTauriStoreHook<StoreExpenseMap>({
    key: KnownStoreKeys.Expenses,
    defaultValue: {},
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

const [useForecastConfigStore] = createTauriStoreHook<ForecastConfigData | null>({
  key: KnownStoreKeys.ForecastConfig,
  defaultValue: null,
});

export function useForecastConfig() {
  const { value, setValue } = useForecastConfigStore();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (value !== null) {
      setLoaded(true);
    } else {
      const t = setTimeout(() => setLoaded(true), 500);
      return () => clearTimeout(t);
    }
  }, [value]);

  return {
    config: value ?? null,
    loaded,
    saveConfig: setValue,
  };
}
