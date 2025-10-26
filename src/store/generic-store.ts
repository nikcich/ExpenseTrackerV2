import { BehaviorSubject } from "rxjs";
import { useEffect, useState } from "react";

export function createStore<T extends object>(initialState: T) {
  const state$ = new BehaviorSubject<T>(initialState);

  const setState = (update: Partial<T> | ((prev: T) => Partial<T>)) => {
    const current = state$.getValue();
    const partial = typeof update === "function" ? update(current) : update;
    state$.next({ ...current, ...partial });
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
