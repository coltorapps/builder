import {
  createSubscriptionManager,
  type Subscribe,
  type SubscriptionEvent,
} from "./subscription-manager";

export function createDataManager<TData, TEvent extends SubscriptionEvent>(
  initialData: TData,
): {
  getData: () => TData;
  setData: (data: TData, events: Array<TEvent>) => TData;
  subscribe: Subscribe<TData, TEvent>;
} {
  let data: TData = initialData;

  function getData(): TData {
    return data;
  }

  const { notify, subscribe } = createSubscriptionManager<TData, TEvent>();

  return {
    subscribe,
    getData,
    setData(newData, events) {
      data = newData;

      notify(data, events);

      return data;
    },
  };
}
