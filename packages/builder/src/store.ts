import { type Subscribe, type SubscriptionEvent } from "./subscription-manager";

export interface Store<TData, TEvent extends SubscriptionEvent> {
  getData(): TData;
  setData(data: TData): void;
  subscribe(
    ...args: Parameters<Subscribe<TData, TEvent>>
  ): ReturnType<Subscribe<TData, TEvent>>;
}
