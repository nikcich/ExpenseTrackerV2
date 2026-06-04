import { API, ForecastConfigData, KnownStoreKeys, Response, StoreExpenseMap } from "../types/types";
import { createTauriApiHooks, createTauriStoreHook } from "../utils/utils";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";

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

export function useForecastConfig() {
  const [config, setConfig] = useState<ForecastConfigData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    invoke<Response<ForecastConfigData | null>>(API.GetJsonValue, {
      key: KnownStoreKeys.ForecastConfig,
    }).then((res) => {
      if (res.status < 400 && res.message) {
        setConfig(res.message);
      }
      setLoaded(true);
    });
  }, []);

  const saveConfig = useCallback(async (newConfig: ForecastConfigData) => {
    const res = await invoke<Response<null>>(API.SetJsonValue, {
      key: KnownStoreKeys.ForecastConfig,
      value: newConfig,
    });
    if (res.status < 400) {
      setConfig(newConfig);
    }
  }, []);

  return { config, loaded, saveConfig };
}
