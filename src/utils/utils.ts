import {
  BehaviorSubject,
  interval,
  Observable,
  startWith,
  Subscription,
  switchMap,
} from "rxjs";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { API, KnownStoreKeys, POLL_INTERVAL_MS } from "../types/types";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";
import { Response } from "../types/types";
import { parse } from "date-fns";
import * as d3 from "d3";

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
  setter: (newValue: T) => void | Promise<void>
) {
  return function useStoreValue() {
    const [value, setValueState] = useState<T>(subject.value);

    useEffect(() => {
      const sub: Subscription = subject
        .pipe(
          distinctUntilChanged((a, b) => deepEqual(a, b)) // 👈 prevents duplicates
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

export const createTauriInvoker = <T>(
  command: API,
  args?: Record<string, unknown>
): (() => Promise<Response<T>>) => {
  return async (): Promise<Response<T>> => {
    return await invoke(command, args);
  };
};

type TauriStoreOptions<T> = {
  key: KnownStoreKeys;
  defaultValue?: T;
};

type PollerArgs<T> = {
  subject: BehaviorSubject<T>;
  args?: Record<string, unknown>;
};

export function createTauriPoller<T>(
  command: API,
  pArgs: PollerArgs<T>
): BehaviorSubject<T> {
  interval(POLL_INTERVAL_MS)
    .pipe(
      startWith(0),
      switchMap(() => invoke<Response<T>>(command, pArgs?.args))
    )
    .subscribe({
      next: (val) => {
        if (val.status >= 400 || !val.message) {
          console.error(
            `Polling for "${command}" returned error:`,
            val?.header
          );
          return;
        }

        pArgs.subject.next(val.message);
      },
      error: (err) => console.error(`Polling for "${command}" failed:`, err),
    });

  return pArgs.subject;
}

export function createTauriApiHooks<
  T,
  Args extends Record<string, any> | undefined = undefined
>(
  getCommand: string, // Tauri command to get value
  setCommand?: string, // Optional Tauri command to set value
  args?: Args, // Optional args for commands
  defaultValue?: T // Default value
) {
  // Subject for reactive updates
  const subject = new BehaviorSubject<T | undefined>(defaultValue);

  const value$ = new BehaviorSubject<T | undefined>(subject.getValue?.());

  // Fetch initial value asynchronously and push into the BehaviorSubject
  invoke<Response<T>>(getCommand, args)
    .then((val) => {
      if (val.status >= 400) {
        console.error(
          `Error fetching initial value for "${getCommand}":`,
          val?.header
        );
        return;
      }

      if (!val.message) return;

      value$.next(val.message);
    })
    .catch(() => {
      // optional: keep current value if invoke fails
      value$.next(subject.getValue?.());
    });

  // Setter function
  const setValue = setCommand
    ? async (newVal: T | undefined) => {
        if (newVal === undefined) return;
        const res: Response<T> = await invoke(setCommand, {
          ...args,
          value: newVal,
        });

        if (res.status >= 400) {
          console.error("Error setting value:", res.header);
          return;
        }

        subject.next(newVal);
      }
    : undefined;

  // Non-debounced React hook
  function useTauriValue(): [
    T | undefined,
    ((val: T | undefined) => Promise<void>)?
  ] {
    const [value, setValueState] = useState<T | undefined>(
      value$.getValue() ?? defaultValue
    );

    useEffect(() => {
      const sub = value$.subscribe(setValueState);
      return () => sub.unsubscribe();
    }, [value$]);

    return [value, setValue] as const;
  }

  // Debounced React hook
  function useDebouncedTauriValue(
    debounceMs: number = 500
  ): [T | undefined, ((val: T | undefined) => Promise<void>)?] {
    const [value, setValueState] = useState<T | undefined>(
      value$.getValue() ?? defaultValue
    );

    useEffect(() => {
      const sub = value$
        .pipe(startWith(value$.getValue()), debounceTime(debounceMs))
        .subscribe(setValueState);
      return () => sub.unsubscribe();
    }, [value$, debounceMs]);

    return [value, setValue] as const;
  }

  return {
    useTauriValue,
    useDebouncedTauriValue,
    value$,
    setValue,
  };
}

export function createTauriStoreHook<T>(options: TauriStoreOptions<T>) {
  const subject = new BehaviorSubject<T | undefined>(options.defaultValue);

  const value$ = createTauriPoller<T | undefined>(API.GetValue, {
    subject,
    args: { key: options.key },
  });

  const setValue = async (newVal: T | undefined) => {
    if (newVal === undefined) return;
    try {
      const res: Response<null> = await invoke(API.SetValue, {
        value: newVal,
      });

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

export function createDebouncedTauriStoreHook<T>(
  options: TauriStoreOptions<T>,
  debounceMs: number = 500
) {
  // Original subject for reactive updates
  const subject = new BehaviorSubject<T | undefined>(options.defaultValue);

  // Create the observable that polls the backend
  const value$ = createTauriPoller<T | undefined>(API.GetValue, {
    subject,
    args: { key: options.key },
  });

  // Debounced version of the observable
  const debounced$ = value$.pipe(debounceTime(debounceMs));

  // Function to set value in the store
  const setValue = async (newVal: T | undefined) => {
    if (newVal === undefined) return;
    try {
      const res: Response<T> = await invoke(API.SetValue, {
        key: options.key,
        value: newVal,
      });

      if (res.status >= 400) {
        console.error("Error setting value:", res.header);
        return;
      }

      value$.next(newVal); // still push immediately so backend stays up-to-date
    } finally {
    }
  };

  // Return a hook that subscribes to the **debounced observable**

  function useDebouncedStoreValue() {
    const [value, setValueState] = useState<T | undefined>(
      options.defaultValue
    );

    useEffect(() => {
      const subscription = debounced$.subscribe(setValueState);
      return () => subscription.unsubscribe();
    }, [debounced$]);

    return [value, setValue] as const;
  }

  return [useDebouncedStoreValue, debounced$] as const;
}

export function createObservableHook<T>(
  observable: Observable<T>,
  initialValue?: T
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
  debounceMs: number = 500
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
