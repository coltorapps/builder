import { type Subscribe, type SubscriptionEvent } from "./subscription-manager";

export type Store<
  TData = unknown,
  TSerializedData = unknown,
  TEvent extends SubscriptionEvent = SubscriptionEvent,
> = {
  getData(): TData;
  setData(data: TData): void;
  getSerializedData(): TSerializedData;
  setSerializedData(data: TSerializedData): void;
  subscribe(
    ...args: Parameters<Subscribe<TData, TEvent>>
  ): ReturnType<Subscribe<TData, TEvent>>;
};
