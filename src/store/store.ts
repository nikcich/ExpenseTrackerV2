import { BehaviorSubject } from 'rxjs';
import { invoke } from '@tauri-apps/api/core';
import { API, } from '../types/types';
import { createTauriPoller, makeUseStoreValue } from '../utils/utils';

const value$ = createTauriPoller<number | undefined>(API.GetValue, {
    subject: new BehaviorSubject<number | undefined>(undefined),
});

async function setValue(newVal: number | undefined) {
    if(newVal === undefined) return;
    await invoke(API.SetValue, { value: newVal });
    value$.next(newVal);
}

export const useValue = makeUseStoreValue<number | undefined>(value$, setValue);