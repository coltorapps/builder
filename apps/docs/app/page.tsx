"use client";

import { useRef, useSyncExternalStore } from "react";

import { useBuilder } from "@builder/react";

import { createBuilder, createEntity } from "../../../packages/builder/dist";

export default function Page() {
  const { store } = useBuilder(
    createBuilder({
      entities: [createEntity({ name: "test" })],
    }),
    {
      onEntityAdded(payload) {
        console.log(payload);
      },
    },
  );

  const entitiesCache = useRef(store.getData().schema.entities);

  const entities = useSyncExternalStore(
    (listen) =>
      store.subscribe((data) => {
        if (data.schema.entities.size !== entitiesCache.current.size) {
          entitiesCache.current = data.schema.entities;
        }

        listen();
      }),
    () => entitiesCache.current,
    () => entitiesCache.current,
  );

  return (
    <>
      <button
        onClick={() => {
          store.addEntity({ type: "test", inputs: {} });
        }}
      >
        add
      </button>
      {JSON.stringify(Object.fromEntries(entities.entries()))}
    </>
  );
}
