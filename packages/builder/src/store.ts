import { type Subscribe } from "./subscription-manager";

export interface Store<TData> {
  getData(): TData;
  subscribe(
    ...args: Parameters<Subscribe<TData>>
  ): ReturnType<Subscribe<TData>>;
}
