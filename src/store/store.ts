import { KnownStoreKeys } from '../types/types';
import { createTauriStoreHook } from '../utils/utils';

export const useValue = createTauriStoreHook<number>({
  key: KnownStoreKeys.MyValue,
});
