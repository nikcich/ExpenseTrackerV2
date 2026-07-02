import { BalanceSnapshot, BalanceSnapshotsMap, ForecastConfigData, KnownStoreKeys, RsuVest, RsuVestsMap, StoreExpenseMap } from "../types/types";
import { createTauriApiHooks, createTauriStoreHook } from "../utils/utils";
import { useCallback, useEffect, useMemo, useState } from "react";

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

const [useRsuVestsStore] = createTauriStoreHook<RsuVestsMap>({
  key: KnownStoreKeys.RsuVests,
  defaultValue: {},
});

export function useRsuVests() {
  const { value, setValue } = useRsuVestsStore();
  const vests = useMemo(() => Object.values(value ?? {}), [value]);

  const addVest = useCallback((vest: RsuVest) => {
    const id = crypto.randomUUID();
    setValue({ ...(value ?? {}), [id]: { ...vest, id } });
  }, [value, setValue]);

  const updateVest = useCallback((id: string, vest: RsuVest) => {
    if (!value) return;
    setValue({ ...value, [id]: vest });
  }, [value, setValue]);

  const removeVest = useCallback((id: string) => {
    if (!value) return;
    const next = { ...value };
    delete next[id];
    setValue(next);
  }, [value, setValue]);

  return { vests, addVest, updateVest, removeVest };
}

const [useBalanceSnapshotsStore] = createTauriStoreHook<BalanceSnapshotsMap>({
  key: KnownStoreKeys.BalanceSnapshots,
  defaultValue: {},
});

export function useBalanceSnapshots() {
  const { value, setValue } = useBalanceSnapshotsStore();
  const snapshots = useMemo(() => Object.values(value ?? {}), [value]);

  const addSnapshot = useCallback((snapshot: BalanceSnapshot) => {
    const id = crypto.randomUUID();
    setValue({ ...(value ?? {}), [id]: { ...snapshot, id } });
  }, [value, setValue]);

  const updateSnapshot = useCallback((id: string, snapshot: BalanceSnapshot) => {
    if (!value) return;
    setValue({ ...value, [id]: snapshot });
  }, [value, setValue]);

  const removeSnapshot = useCallback((id: string) => {
    if (!value) return;
    const next = { ...value };
    delete next[id];
    setValue(next);
  }, [value, setValue]);

  return { snapshots, addSnapshot, updateSnapshot, removeSnapshot };
}

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
