import { BalanceSnapshot, BalanceSnapshotsMap, DynamicCsvDefinition, ForecastConfigData, Grant, GrantMap, KnownStoreKeys, RsuVest, RsuVestsMap, Sale, SalesMap, SsdiConfig, SsdiPayPeriod, Stock, StockMap, StoreExpenseMap } from "../types/types";
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

const [useStocksStore] = createTauriStoreHook<StockMap>({
  key: KnownStoreKeys.Stocks,
  defaultValue: {},
  mockData: MOCK_DATA_MAP[KnownStoreKeys.Stocks] as StockMap | undefined,
});

export function useStocks() {
  const { value, setValue } = useStocksStore();
  const stocks = useMemo(() => Object.values(value ?? {}), [value]);

  const addStock = useCallback((stock: Stock) => {
    const id = crypto.randomUUID();
    setValue({ ...(value ?? {}), [id]: { ...stock, id } });
  }, [value, setValue]);

  const updateStock = useCallback((id: string, stock: Stock) => {
    if (!value) return;
    setValue({ ...value, [id]: stock });
  }, [value, setValue]);

  const removeStock = useCallback((id: string) => {
    if (!value) return;
    const next = { ...value };
    delete next[id];
    setValue(next);
  }, [value, setValue]);

  return { stocks, addStock, updateStock, removeStock };
}

const [useGrantsStore] = createTauriStoreHook<GrantMap>({
  key: KnownStoreKeys.Grants,
  defaultValue: {},
  mockData: MOCK_DATA_MAP[KnownStoreKeys.Grants] as GrantMap | undefined,
});

export function useGrants() {
  const { value, setValue } = useGrantsStore();
  const grants = useMemo(() => Object.values(value ?? {}), [value]);

  const addGrant = useCallback((grant: Grant) => {
    const id = crypto.randomUUID();
    setValue({ ...(value ?? {}), [id]: { ...grant, id } });
  }, [value, setValue]);

  const updateGrant = useCallback((id: string, grant: Grant) => {
    if (!value) return;
    setValue({ ...value, [id]: grant });
  }, [value, setValue]);

  const removeGrant = useCallback((id: string) => {
    if (!value) return;
    const next = { ...value };
    delete next[id];
    setValue(next);
  }, [value, setValue]);

  return { grants, addGrant, updateGrant, removeGrant };
}

const [useSalesStore] = createTauriStoreHook<SalesMap>({
  key: KnownStoreKeys.Sales,
  defaultValue: {},
  mockData: MOCK_DATA_MAP[KnownStoreKeys.Sales] as SalesMap | undefined,
});

export function useSales() {
  const { value, setValue } = useSalesStore();
  const sales = useMemo(() => Object.values(value ?? {}), [value]);

  const addSale = useCallback((sale: Sale) => {
    const id = crypto.randomUUID();
    setValue({ ...(value ?? {}), [id]: { ...sale, id } });
  }, [value, setValue]);

  const updateSale = useCallback((id: string, sale: Sale) => {
    if (!value) return;
    setValue({ ...value, [id]: sale });
  }, [value, setValue]);

  const removeSale = useCallback((id: string) => {
    if (!value) return;
    const next = { ...value };
    delete next[id];
    setValue(next);
  }, [value, setValue]);

  return { sales, addSale, updateSale, removeSale };
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

export function useHasRsuData() {
  const { vests } = useRsuVests();
  const { stocks } = useStocks();
  const { grants } = useGrants();
  const { sales } = useSales();

  return vests.length > 0 || stocks.length > 0 || grants.length > 0 || sales.length > 0;
}

const [useCustomCsvDefinitionsStore] = createTauriStoreHook<DynamicCsvDefinition[]>({
  key: KnownStoreKeys.CustomCsvDefinitions,
  defaultValue: [],
});

export function useCustomCsvDefinitions() {
  const { value, setValue } = useCustomCsvDefinitionsStore();
  const definitions = useMemo(() => value ?? [], [value]);

  const addDefinition = useCallback((def: DynamicCsvDefinition) => {
    setValue([...(value ?? []), def]);
  }, [value, setValue]);

  const updateDefinition = useCallback((def: DynamicCsvDefinition) => {
    setValue((value ?? []).map((d) => (d.id === def.id ? def : d)));
  }, [value, setValue]);

  const removeDefinition = useCallback((id: string) => {
    setValue((value ?? []).filter((d) => d.id !== id));
  }, [value, setValue]);

  return { definitions, addDefinition, updateDefinition, removeDefinition };
}

const [useSsdiPayPeriodsStore] = createTauriStoreHook<Record<string, SsdiPayPeriod>>({
  key: KnownStoreKeys.SsdiPayPeriods,
  defaultValue: {},
  mockData: MOCK_DATA_MAP[KnownStoreKeys.SsdiPayPeriods] as Record<string, SsdiPayPeriod> | undefined,
});

export function useSsdiPayPeriods() {
  const { value, setValue } = useSsdiPayPeriodsStore();
  const periods = useMemo(() => Object.values(value ?? {}), [value]);

  const addPeriod = useCallback((period: SsdiPayPeriod) => {
    const id = crypto.randomUUID();
    setValue({ ...(value ?? {}), [id]: { ...period, id } });
  }, [value, setValue]);

  const updatePeriod = useCallback((id: string, period: SsdiPayPeriod) => {
    if (!value) return;
    setValue({ ...value, [id]: period });
  }, [value, setValue]);

  const removePeriod = useCallback((id: string) => {
    if (!value) return;
    const next = { ...value };
    delete next[id];
    setValue(next);
  }, [value, setValue]);

  return { periods, addPeriod, updatePeriod, removePeriod };
}

const [useSsdiConfigStore] = createTauriStoreHook<SsdiConfig>({
  key: KnownStoreKeys.SsdiConfig,
  defaultValue: { year: new Date().getFullYear(), sgaMonthlyAmount: 1620 },
  mockData: MOCK_DATA_MAP[KnownStoreKeys.SsdiConfig] as SsdiConfig | undefined,
});

export function useSsdiConfig() {
  const { value, setValue } = useSsdiConfigStore();
  return { config: value, saveConfig: setValue };
}
