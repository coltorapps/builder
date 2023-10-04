import { type Subscribe, type SubscriptionEvent } from "./subscription-manager";

export interface Store<
  TData = unknown,
  TRawData = unknown,
  TEvent extends SubscriptionEvent = SubscriptionEvent,
> {
  getData(): TData;
  setData(data: TData): void;
  setRawData(data: TRawData): void;
  subscribe(
    ...args: Parameters<Subscribe<TData, TEvent>>
  ): ReturnType<Subscribe<TData, TEvent>>;
}
