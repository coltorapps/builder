"use client";

import {
  Builder,
  createEntityComponent,
  createInputComponent,
  useActiveEntityId,
  useBuilder,
} from "@builder/react";

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
            if (value.length < 5) {
              console.log("err");

              throw new Error("Too short");
            }
            return value;
          },
        }),
        createInput({
          name: "kebag2",
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
            if (typeof value !== "number") {
              throw new Error();
            }
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
        {entity.id} {entity.type} {entity.inputs.label} {entity.inputs.kebag2}
        <div style={{ paddingLeft: "1rem" }}>{children}</div>
      </div>
    );
  },
);

const kebagComponent = createInputComponent(
  builder.entities[1].inputs[0],
  ({ input, validate, onChange }) => {
    return (
      <div>
        Kebag {input.name}{" "}
        <input
          value={input.value}
          onChange={(e) => {
            onChange(Number(e.target.value));
            void validate();
          }}
        />
      </div>
    );
  },
);

const kebag2Component = createInputComponent(
  builder.entities[0].inputs[1],
  ({ input, onChange, validate }) => {
    return (
      <div>
        Kebag {input.name}{" "}
        <input
          value={input.value}
          onChange={(e) => {
            onChange(e.target.value);

            void validate();
          }}
        />
      </div>
    );
  },
);

const labelComponent = createInputComponent(
  builder.entities[0].inputs[0],
  ({ input, validate, onChange }) => {
    return (
      <div>
        input {input.name}{" "}
        <input
          value={input.value}
          onChange={(e) => {
            onChange(e.target.value);
            void validate();
          }}
        />
        <div style={{ color: "red" }}>
          {input.error instanceof Error ? input.error.message : null}
        </div>
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

  const [selectedEntityId, setSelectedEntityId] = useActiveEntityId(
    client.schemaStore,
  );

  return (
    <>
      <button
        onClick={() => {
          client.schemaStore.addEntity({
            type: "test",
            inputs: {
              label: "label",
              kebag2: "kebag",
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
        {({ children, entity }) => {
          return (
            <div
              onClick={(e) => {
                e.stopPropagation();

                if (selectedEntityId === entity.id) {
                  setSelectedEntityId(null);
                } else {
                  setSelectedEntityId(entity.id);
                }
              }}
            >
              <div
                style={{
                  paddingLeft: "1rem",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor:
                    selectedEntityId === entity.id ? "blue" : "transparent",
                }}
              >
                {children}{" "}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    client.schemaStore.deleteEntity(entity.id);
                  }}
                >
                  delete
                </button>
                {entity.inputsErrors ? (
                  <span style={{ color: "red" }}>!!!</span>
                ) : null}
              </div>
            </div>
          );
        }}
      </Builder.Entities>
      <Builder.Inputs
        {...client}
        entityId={selectedEntityId}
        inputsComponents={{
          select: {
            kebag: kebagComponent,
          },
          test: {
            label: labelComponent,
            kebag2: kebag2Component,
          },
        }}
      >
        {({ children }) => {
          return <div style={{ border: "1px solid black" }}>{children}</div>;
        }}
      </Builder.Inputs>
    </>
  );
}
