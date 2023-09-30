import { type SubscriptionEvent, type Subscribe } from "./subscription-manager";

export interface Store<TData, TEvent extends SubscriptionEvent> {
  getData(): TData;
  subscribe(
    ...args: Parameters<Subscribe<TData, TEvent>>
  ): ReturnType<Subscribe<TData, TEvent>>;
}
