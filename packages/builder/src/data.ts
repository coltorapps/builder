import { createSubscriptionManager, type Subscribe } from "./subscription";

export function createDataManager<TData>(data: TData): {
  getData: () => TData;
  setData: (setter: (oldData: TData) => TData) => TData;
  subscribe: Subscribe<TData>;
} {
  let localData: TData = data;

  function getData(): TData {
    return localData;
  }

  const { notify, subscribe } = createSubscriptionManager<TData>();

  return {
    subscribe,
    getData,
    setData(setter) {
      localData = setter(getData());

      notify(localData);

      return localData;
    },
  };
}
