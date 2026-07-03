import { BalanceSnapshot, BalanceSnapshotsMap, ForecastConfigData, KnownStoreKeys, RsuVest, RsuVestsMap, StoreExpenseMap } from "../types/types";
import { createTauriApiHooks, createTauriStoreHook } from "../utils/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MOCK_BRUSH_RANGE, MOCK_DATA_MAP } from "@/types/mockExpenses";

export const {
  useTauriValue: useInstantBrushRange,
  useDebouncedTauriValue: useDebouncedBrushRange,
  value$: instantBrushRange$,
} = createTauriApiHooks<[number, number]>("get_date_range", undefined, undefined, undefined, MOCK_BRUSH_RANGE);

const [useExpensesStoreInner, expenses$] =
  createTauriStoreHook<StoreExpenseMap>({
    key: KnownStoreKeys.Expenses,
    defaultValue: {},
    mockData: MOCK_DATA_MAP[KnownStoreKeys.Expenses] as StoreExpenseMap | undefined,
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
  mockData: MOCK_DATA_MAP[KnownStoreKeys.ForecastConfig] as ForecastConfigData | undefined,
});

const [useRsuVestsStore] = createTauriStoreHook<RsuVestsMap>({
  key: KnownStoreKeys.RsuVests,
  defaultValue: {},
  mockData: MOCK_DATA_MAP[KnownStoreKeys.RsuVests] as RsuVestsMap | undefined,
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
  mockData: MOCK_DATA_MAP[KnownStoreKeys.BalanceSnapshots] as BalanceSnapshotsMap | undefined,
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
