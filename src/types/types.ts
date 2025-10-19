export const POLL_INTERVAL_MS = 10000;

export enum API {
    GetValue = "store_get_value",
    SetValue = "store_set_value",
    NewWindow = "new_window",
}

export enum KnownStoreKeys {
    MyValue = "my_value",
}