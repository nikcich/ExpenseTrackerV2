import {
  BehaviorSubject,
  merge,
  Observable,
  of,
  Subscription,
  switchMap,
} from "rxjs";
import { useEffect, useState } from "react";
import { KnownStoreKeys } from "../types/types";
import { debounceTime, distinctUntilChanged, filter, skip } from "rxjs/operators";
import { Response } from "../types/types";
import { parse } from "date-fns";
import * as d3 from "d3";
import { activeService$, getActiveService } from "@/services/ServiceProvider";

export const SHORTCUT_COOLDOWN = 300;

export const preventDoubleClick = <T extends (...args: any[]) => any>(
  fn: T,
  delay = SHORTCUT_COOLDOWN
) => {
  let lastCall = 0;
  return ((...args: Parameters<T>) => {
    if (Date.now() - lastCall < delay) return undefined as unknown as ReturnType<T>;
    lastCall = Date.now();
    return fn(...args);
  }) as T;
};

function deepEqual(a: any, b: any): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a == null || b == null)
    return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => deepEqual(a[key], b[key]));
}

export function makeUseStoreValue<T>(
  subject: BehaviorSubject<T>,
  setter: (newValue: T) => void | Promise<void>,
) {
  return function useStoreValue() {
    const [value, setValueState] = useState<T>(subject.value);

    useEffect(() => {
      const sub: Subscription = subject
        .pipe(
          distinctUntilChanged((a, b) => deepEqual(a, b)), // 👈 prevents duplicates
        )
        .subscribe(setValueState);

      return () => sub.unsubscribe();
    }, []);

    return {
      value,
      setValue: setter,
    };
  };
}

function fromStoreChanged(): Observable<{ key: string }> {
  return new Observable<{ key: string }>((subscriber) => {
    let unlisten: (() => void) | undefined;
    const serviceSub = activeService$.subscribe((service) => {
      unlisten?.();
      unlisten = service?.onStoreChanged((key) => subscriber.next({ key }));
    });
    return () => {
      unlisten?.();
      serviceSub.unsubscribe();
    };
  });
}

type StoreOptions<T> = {
  key: KnownStoreKeys;
  defaultValue?: T;
};

export function createStorePoller<T>(
  key: string,
  subject: BehaviorSubject<T>,
): BehaviorSubject<T> {
  merge(
    of(0),
    activeService$.pipe(skip(1)),
    fromStoreChanged().pipe(filter((payload) => payload.key === key)),
  )
    .pipe(
      switchMap(async () => {
        const service = getActiveService();
        if (!service) return undefined;
        return service.getStoreValue<T>(key);
      }),
    )
    .subscribe({
      next: (val) => {
        if (!val) return;
        if (val.status >= 400 || !val.message) {
          if (val.status === 404) {
            subject.next(undefined as T);
          }
          console.error(`Polling for "${key}" returned error:`, val?.header);
          return;
        }

        subject.next(val.message);
      },
      error: (err) => console.error(`Polling for "${key}" failed:`, err),
    });

  return subject;
}

export function createStoreHook<T>(options: StoreOptions<T>) {
  const subject = new BehaviorSubject<T | undefined>(options.defaultValue);

  const value$ = createStorePoller<T | undefined>(options.key, subject);

  const setValue = async (newVal: T | undefined) => {
    if (newVal === undefined) return;
    const service = getActiveService();
    if (!service) return;
    try {
      const res: Response<null> = await service.setStoreValue(options.key, newVal);

      if (res.status >= 400) {
        console.error("Error setting value:", res.header);
        return;
      }

      value$.next(newVal);
    } finally {
    }
  };

  return [makeUseStoreValue<T | undefined>(value$, setValue), value$] as const;
}

export function createObservableHook<T>(
  observable: Observable<T>,
  initialValue?: T,
) {
  return function useObservableValue() {
    const [value, setValue] = useState<T | undefined>(initialValue);

    useEffect(() => {
      const subscription = observable.subscribe(setValue);
      return () => subscription.unsubscribe();
    }, [observable]);

    return value;
  };
}

export function createDebouncedObservableHook<T>(
  observable: Observable<T>,
  initialValue?: T,
  debounceMs: number = 500,
) {
  return function useDebouncedObservableValue() {
    const [value, setValue] = useState<T | undefined>(initialValue);

    useEffect(() => {
      const subscription = observable
        .pipe(debounceTime(debounceMs))
        .subscribe(setValue);

      return () => subscription.unsubscribe();
    }, [observable, debounceMs]);

    return value;
  };
}

export const parseDate = (dateStr: string): Date => {
  const date = parse(dateStr, "yyyy-MM-dd'T'HH:mm:ss", new Date());
  return date;
};

export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export function formatShortDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", {
    month: "short", year: "numeric",
  });
}

export function formatMonthShort(date: Date): string {
  return date.toLocaleString("default", { month: "short" });
}

export function formatCurrency(n: number): string {
  const abs = Math.abs(n);
  const s = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs);
  return n < 0 ? `-${s}` : s;
}

export function formatCompactCurrency(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 10_000) {
    return `${sign}$${(abs / 1000).toFixed(0)}k`;
  }
  if (abs >= 1000) {
    return `${sign}$${(abs / 1000).toFixed(1)}k`;
  }
  return `${sign}$${abs.toFixed(2)}`;
}

export function formatPercent(pct: number): string {
  return `${Math.round(pct)}%`;
}

const parsers = [
  d3.timeParse("%b %Y"), // "Aug 2025"
  d3.timeParse("%m/%d/%Y"), // "08/16/2025"
  d3.timeParse("%Y"), // "2025"
  d3.timeParse("%Y-%m-%d"), // optional: "2025-08-16"
];

function normalizeDateToken(input: string): string {
  // Keep up to first invalid character
  const match = input.match(/^[A-Za-z0-9\/\-\s]+/);

  return match ? match[0].trim() : input.trim();
}

function parseFlexibleDate(raw: string): Date | null {
  const cleaned = normalizeDateToken(raw);

  for (const parse of parsers) {
    const result = parse(cleaned);
    if (result) return result;
  }

  // fallback to JS date
  const native = new Date(cleaned);
  return isNaN(native.getTime()) ? null : native;
}

export const chartDateCompare = (a: string, b: string): number => {
  const da = parseFlexibleDate(a);
  const db = parseFlexibleDate(b);

  if (!da && !db) return 0;
  if (!da) return 1;
  if (!db) return -1;

  return da.getTime() - db.getTime();
};
