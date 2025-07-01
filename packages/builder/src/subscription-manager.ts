interface Listener<TData> {
  (newData: TData, prevData: TData): void;
}

export interface Subscribe<TData> {
  (listener: Listener<TData>): () => void;
}

export function createSubscriptionManager<TData>(): {
  notify: (newData: TData, prevData: TData) => void;
  subscribe: Subscribe<TData>;
} {
  const listeners = new Set<Listener<TData>>();

  return {
    notify(newData, prevData) {
      listeners.forEach((listener) => listener(newData, prevData));
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}
