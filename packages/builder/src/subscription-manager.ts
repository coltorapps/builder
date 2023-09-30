interface Listener<TData, TEvent extends SubscriptionEvent> {
  (data: TData, events: Set<TEvent>): void;
}

export interface Subscribe<TData, TEvent extends SubscriptionEvent> {
  (listener: Listener<TData, TEvent>): () => void;
}

export interface SubscriptionEvent<
  TName extends string = string,
  TPayload = unknown,
> {
  name: TName;
  payload: TPayload;
}

export function createSubscriptionManager<
  TData,
  TEvent extends SubscriptionEvent,
>(): {
  notify: (data: TData, events: Set<TEvent>) => void;
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
