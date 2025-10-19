import { BehaviorSubject, interval, startWith, Subscription, switchMap } from 'rxjs';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from 'react';
import { POLL_INTERVAL_MS } from '../types/types';

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

type PollerArgs<T> = {
    subject: BehaviorSubject<T>;
    args?: Record<string, unknown>;
}

export function createTauriPoller<T>(
  command: string,
  pArgs: PollerArgs<T>
): BehaviorSubject<T> {
  interval(POLL_INTERVAL_MS)
    .pipe(startWith(0), switchMap(() => invoke<T>(command, pArgs?.args)))
    .subscribe({
      next: (val) => pArgs.subject.next(val),
      error: (err) =>
        console.error(`Polling for "${command}" failed:`, err),
    });

    return pArgs.subject;
}