import { BehaviorSubject } from "rxjs";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export function createStore<T extends object>(initialState: T, persistKey?: string) {
  const state$ = new BehaviorSubject<T>(initialState);

  if (persistKey) {
    invoke<Record<string, unknown> | null>("store_get_json_value", { key: persistKey })
      .then((stored) => {
        if (stored && typeof stored === "object") {
          state$.next({ ...initialState, ...stored } as T);
        }
      })
      .catch(() => {});
  }

  const setState = (update: Partial<T> | ((prev: T) => Partial<T>)) => {
    const current = state$.getValue();
    const partial = typeof update === "function" ? update(current) : update;
    const next = { ...current, ...partial };
    state$.next(next);

    if (persistKey) {
      invoke("store_set_json_value", { key: persistKey, value: next }).catch(() => {});
    }
  };

  const getState = () => state$.getValue();

  // React hook to subscribe to state
  function useStore<K extends keyof T = keyof T>(
    key?: K | ((state: T) => any)
  ): K extends keyof T ? T[K] : T {
    const [value, setValue] = useState<any>(
      key
        ? typeof key === "function"
          ? key(getState())
          : getState()[key]
        : getState()
    );

    useEffect(() => {
      const sub = state$.subscribe((state) => {
        if (key) {
          const val = typeof key === "function" ? key(state) : state[key];
          setValue(val);
        } else {
          setValue(state);
        }
      });
      return () => sub.unsubscribe();
    }, [key]);

    return value;
  }

  return { state$, setState, getState, useStore };
}
