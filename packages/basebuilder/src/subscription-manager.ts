type Listener<TData, TEvent extends SubscriptionEvent> = {
  (data: TData, events: Array<TEvent>): void;
};

export type Subscribe<TData, TEvent extends SubscriptionEvent> = {
  (listener: Listener<TData, TEvent>): () => void;
};

export type SubscriptionEvent<
  TName extends string = string,
  TPayload = unknown,
> = {
  name: TName;
  payload: TPayload;
};

export function createSubscriptionManager<
  TData,
  TEvent extends SubscriptionEvent,
>(): {
  notify: (data: TData, events: Array<TEvent>) => void;
  subscribe: Subscribe<TData, TEvent>;
} {
  const listeners = new Set<Listener<TData, TEvent>>();

  return {
    notify(data, events) {
      listeners.forEach((listener) => {
        listener(data, events);
      });
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}
