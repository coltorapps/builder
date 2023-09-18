"use client";

import { Builder, useBuilder } from "@builder/react";

import { createBuilder, createEntity } from "../../../packages/builder/dist";

export default function Page() {
  const { store } = useBuilder(
    createBuilder({
      entities: [createEntity({ name: "test" })],
      childrenAllowed: {
        test: true
      }
    }),
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
      <button
        onClick={() => {
          store.updateEntity(
            Array.from(store.getData().schema.root.values())[0]!,
            { index: 10 },
          );
        }}
      >
        mov
      </button>
      <button
        onClick={() => {
          store.updateEntity(
            Array.from(store.getData().schema.root.values())[0]!,
            { parentId: Array.from(store.getData().schema.root.values())[1]! },
          );

          console.log(store.getData());
          
        }}
      >
        add child
      </button>
      <Builder store={store} />
    </>
  );
}
