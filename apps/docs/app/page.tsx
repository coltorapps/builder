"use client";

import { useSyncExternalStore } from "react";
import { schemaValidationErrorCodes } from "builder";

import {
  Builder,
  createEntityComponent,
  createInputComponent,
  useActiveEntityId,
  useBuilder,
} from "@builder/react";

import { builder } from "./builder";
import { testServer } from "./test";

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
          {typeof input.error === "string" ? input.error : undefined}
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

  const inputsErrors = useSyncExternalStore(
    (listen) => client.inputsValidationStore.subscribe(listen),
    () => client.inputsValidationStore.getData(),
    () => client.inputsValidationStore.getData(),
  );

  return (
    <>
      <button
        onClick={() => {
          client.schemaStore.addEntity({
            type: "test",
            inputs: {
              label: "lab",
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
                {inputsErrors.entitiesInputsErrors.has(entity.id) &&
                selectedEntityId !== entity.id ? (
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
      <button
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onClick={async () => {
          const res = await testServer(client.schemaStore.getSerializedData());

          console.log(res);
          client.inputsValidationStore.resetEntitiesInputsErrors();

          setTimeout(() => {
            if (
              !res.success &&
              res.reason.code ===
                schemaValidationErrorCodes.InvalidEntitiesInputs
            ) {
              client.inputsValidationStore.setRawData(res.reason.payload);

              const firstEntityWithErrors = Object.keys(
                res.reason.payload.entitiesInputsErrors,
              )[0];

              if (
                selectedEntityId &&
                res.reason.payload.entitiesInputsErrors[selectedEntityId]
              ) {
                return;
              }

              if (firstEntityWithErrors) {
                setSelectedEntityId(firstEntityWithErrors);
              }
            }
          }, 1000);
        }}
      >
        go
      </button>
    </>
  );
}
