import { useEffect, useRef } from "react";
import {
  createStore,
  storeEventsNames,
  type Builder,
  type Schema,
  type Store,
  type StoreEvent,
} from "builder";

export function useBuilder<TBuilder extends Builder>(
  builder: TBuilder,
  options: {
    schema?: Schema<TBuilder>;
    onEntityAdded?: (
      event: Extract<
        StoreEvent<TBuilder>,
        { name: typeof storeEventsNames.EntityAdded }
      >["payload"],
    ) => void;
    onEntityUpdated?: (
      event: Extract<
        StoreEvent<TBuilder>,
        { name: typeof storeEventsNames.EntityUpdated }
      >["payload"],
    ) => void;
    onEntityDeleted?: (
      event: Extract<
        StoreEvent<TBuilder>,
        { name: typeof storeEventsNames.EntityDeleted }
      >["payload"],
    ) => void;
  } = {},
): { store: Store<TBuilder> } {
  const storeRef = useRef(createStore(builder, options));

  const { onEntityAdded, onEntityDeleted, onEntityUpdated } = options;

  useEffect(() => {
    return storeRef.current.subscribeToEvents((event) => {
      switch (event.name) {
        case storeEventsNames.EntityAdded: {
          onEntityAdded?.(event.payload);

          return;
        }
        case storeEventsNames.EntityUpdated: {
          onEntityUpdated?.(event.payload);

          return;
        }
        case storeEventsNames.EntityDeleted: {
          onEntityDeleted?.(event.payload);

          return;
        }
        default: {
          break;
        }
      }
    });
  }, [onEntityAdded, onEntityDeleted, onEntityUpdated]);

  return {
    store: storeRef.current,
  };
}
