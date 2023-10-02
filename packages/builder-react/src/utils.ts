export type KeyofUnion<T> = T extends unknown ? keyof T : never;
