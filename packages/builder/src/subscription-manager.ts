interface Listener<TData> {
  (data: TData): void;
}

export interface Subscribe<TData> {
  (listener: Listener<TData>): () => void;
}

export function createSubscriptionManager<TData>(): {
  notify: (data: TData) => void;
  subscribe: Subscribe<TData>;
} {
  const listeners = new Set<Listener<TData>>();

  return {
    notify(data: TData) {
      listeners.forEach((listener) => {
        listener(data);
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
