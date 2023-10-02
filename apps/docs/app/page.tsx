"use client";

import { Builder, createEntityComponent, useBuilder } from "@builder/react";

import {
  createBuilder,
  createEntity,
  createInput,
} from "../../../packages/builder/dist";

const builder = createBuilder({
  entities: [
    createEntity({
      name: "test",
      inputs: [
        createInput({
          name: "label",
          validate(value) {
            if (typeof value !== "string") {
              throw new Error();
            }
            return value;
          },
        }),
      ],
      validate(value) {
        if (typeof value !== "string") {
          throw new Error();
        }
        return value;
      },
    }),
    createEntity({
      name: "select",
      inputs: [
        createInput({
          name: "kebag",
          validate(value) {
            return value;
          },
        }),
      ],
    }),
  ],
  childrenAllowed: {
    test: true,
  },
});

const testComponent = createEntityComponent(
  builder.entities[0],
  ({ entity, children }) => {
    return (
      <div>
        {entity.id} {entity.type}
        <div style={{ paddingLeft: "1rem" }}>{children}</div>
      </div>
    );
  },
);

const selectComponent = createEntityComponent(
  builder.entities[1],
  ({ entity }) => {
    return (
      <div>
        {entity.id} {entity.type}
      </div>
    );
  },
);

export default function Page() {
  const client = useBuilder(builder);

  return (
    <>
      <button
        onClick={() => {
          client.schemaStore.addEntity({
            type: "test",
            inputs: {
              label: "",
            },
          });
        }}
      >
        add
      </button>
      <button
        onClick={() => {
          client.schemaStore.moveEntityToRoot(
            Array.from(client.schemaStore.getData().root.values())[0]!,
            10,
          );
        }}
      >
        mov
      </button>
      <button
        onClick={() => {
          client.schemaStore.moveEntityToParent(
            Array.from(client.schemaStore.getData().root.values())[0]!,
            Array.from(client.schemaStore.getData().root.values())[1]!,
          );

          console.log(client.schemaStore.getData());
        }}
      >
        add child
      </button>
      <Builder.Entities
        {...client}
        entitiesComponents={{
          test: testComponent,
          select: selectComponent,
        }}
      >
        {({ children }) => {
          return (
            <div>
              <div style={{ paddingLeft: "1rem" }}>{children}</div>
            </div>
          );
        }}
      </Builder.Entities>
    </>
  );
}
