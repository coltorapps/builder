"use client";

import { Builder, useBuilder } from "@builder/react";

import { createBuilder, createEntity } from "../../../packages/builder/dist";

// const builder = createBuilder({
//   entities: [createEntity({ name: "test" })],
//   childrenAllowed: {
//     test: true,
//   },
// });

export default function Page() {
  const client = useBuilder(
    createBuilder({
      entities: [createEntity({ name: "test" })],
      childrenAllowed: {
        test: true,
      },
    }),
  );

  return (
    <>
      {/* <button
        onClick={() => {
          client.schemaStore.addEntity({ type: "test", inputs: {} });
        }}
      >
        add
      </button>
      <button
        onClick={() => {
          client.schemaStore.updateEntity(
            Array.from(client.schemaStore.getData().root.values())[0]!,
            { index: 10 },
          );
        }}
      >
        mov
      </button>
      <button
        onClick={() => {
          client.schemaStore.updateEntity(
            Array.from(client.schemaStore.getData().root.values())[0]!,
            {
              parentId: Array.from(
                client.schemaStore.getData().root.values(),
              )[1]!,
            },
          );

          console.log(client.schemaStore.getData());
        }}
      >
        add child
      </button> */}
      <Builder client={client}>
        {({ entity, children }) => {
          return (
            <div>
              {entity.id}
              <div style={{ paddingLeft: "1rem" }}>{children}</div>
            </div>
          );
        }}
      </Builder>
    </>
  );
}
