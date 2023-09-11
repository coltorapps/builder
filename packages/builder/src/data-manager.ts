import {
  createSubscriptionManager,
  type Subscribe,
} from "./subscription-manager";

export function createDataManager<TData>(initialData: TData): {
  getData: () => TData;
  setData: (setter: (oldData: TData) => TData) => TData;
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
    setData(setter) {
      data = setter(getData());

      notify(data);

      return data;
    },
  };
}
