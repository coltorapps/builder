import {
  createSubscriptionManager,
  type Subscribe,
} from "./subscription-manager";

export function createDataManager<TData>(initialData: TData): {
  getData: () => TData;
  setData: (data: TData) => TData;
  subscribe: Subscribe<TData>;
} {
  let data: TData = initialData;

  function getData(): TData {
    return data;
  }

  const { notify, subscribe } = createSubscriptionManager<TData>();

  return {
    subscribe,
    getData,
    setData(newData) {
      data = newData;

      notify(data);

      return data;
    },
  };
}
