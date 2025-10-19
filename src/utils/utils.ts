import { BehaviorSubject, interval, startWith, Subscription, switchMap } from 'rxjs';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from 'react';
import { API, KnownStoreKeys, POLL_INTERVAL_MS } from '../types/types';

export function makeUseStoreValue<T>(
  subject: BehaviorSubject<T>,
  setter: (newValue: T) => void | Promise<void>
) {
  return function useStoreValue() {
    const [value, setValueState] = useState<T>(subject.value);

    useEffect(() => {
      const sub: Subscription = subject.subscribe(setValueState);
      return () => sub.unsubscribe();
    }, []);

    return {
      value,
      setValue: setter,
    };
  };
}

export const createTauriInvoker = (command: API, args?: Record<string, unknown>) => {
  return async () => await invoke(command, args);
}

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
  pArgs: PollerArgs<T>,
): BehaviorSubject<T> {
  interval(POLL_INTERVAL_MS)
    .pipe(
      startWith(0),
      switchMap(() => invoke<T>(command, pArgs?.args))
    )
    .subscribe({
      next: (val) => {        
          pArgs.subject.next(val);
      },
      error: (err) =>
        console.error(`Polling for "${command}" failed:`, err),
    });

  return pArgs.subject;
}

export function createTauriStoreHook<T>(options: TauriStoreOptions<T>) {
  const subject = new BehaviorSubject<T | undefined>(options.defaultValue);
  let updating = false;

  const value$ = createTauriPoller<T | undefined>(API.GetValue, {
    subject,
    args: { key: options.key },
  });

  const setValue = async (newVal: T | undefined) => {
    if (newVal === undefined) return;
    updating = true;
    try {
      await invoke(API.SetValue, { key: options.key, value: newVal });
      subject.next(newVal); 
    } finally {
      updating = false;
    }
  };

  return makeUseStoreValue<T | undefined>(value$, setValue);
}