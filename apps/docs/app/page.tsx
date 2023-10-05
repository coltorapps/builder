"use client";

import { schemaValidationErrorCodes } from "builder";

import {
  Builder,
  createEntityComponent,
  createInputComponent,
  useActiveEntityId,
  useBuilder,
  useInputsValidationStore,
  useSchemaStoreData,
} from "@builder/react";

import { builder, labelInput, textEntity, visibleWhenInput } from "./builder";
import { testServer } from "./test";

const textComponent = createEntityComponent(textEntity, ({ entity }) => {
  return (
    <div>
      {entity.inputs.label}
      <input />
    </div>
  );
});

const visibleWhenComponent = createInputComponent(
  visibleWhenInput,
  ({ input, onChange, validate }) => {
    const schemaStoreData = useSchemaStoreData<typeof builder>();
    const err = useInputsValidationStore();

    return (
      <div>
        Visible when
        <select
          value={input.value?.entityId ?? ""}
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          onChange={async (e) => {
            if (!e.target.value) {
              onChange(undefined);
            } else {
              onChange({ entityId: e.target.value });
            }

            await validate();

            setTimeout(() => {
              console.log(err.resetEntitiesInputsErrors());
            }, 1000);
          }}
        >
          <option value="">Select</option>
          {Array.from(schemaStoreData.entities.entries()).map(
            ([id, entity]) => (
              <option key={id} value={id}>
                {entity.inputs.label}
              </option>
            ),
          )}
        </select>
        <span style={{ color: "red" }}>
          {typeof input.error === "string"
            ? input.error
            : JSON.stringify(input.error)}
        </span>
      </div>
    );
  },
);

const labelComponent = createInputComponent(
  labelInput,
  ({ input, onChange, validate }) => {
    return (
      <div>
        Label
        <input
          value={input.value ?? ""}
          onChange={(e) => {
            onChange(e.target.value);

            void validate();
          }}
        />
        <span style={{ color: "red" }}>
          {typeof input.error === "string"
            ? input.error
            : JSON.stringify(input.error)}
        </span>
      </div>
    );
  },
);

export default function Page() {
  const client = useBuilder(builder, {
    events: {
      schemaStore: {
        onEntityDeleted(payload) {
          const entities = client.schemaStore.getData().entities;

          entities.forEach((entity, id) => {
            if (
              entity.type === "text" &&
              entity.inputs.visibleWhen?.entityId === payload.entity.id
            ) {
              client.schemaStore.setEntityInput(id, "visibleWhen", undefined);
            }
          });
        },
      },
      inputsValidationStore: {
        onEntityInputErrorUpdated(payload) {
          payload.entityId;
        },
      },
    },
  });

  const [selectedEntityId, setSelectedEntityId] = useActiveEntityId(
    client.schemaStore,
  );

  return (
    <>
      <button
        onClick={() => {
          client.schemaStore.addEntity({
            type: "text",
            inputs: {
              label: "Text Input",
            },
          });
        }}
      >
        add
      </button>

      <Builder.Entities
        {...client}
        entitiesComponents={{
          text: textComponent,
        }}
      >
        {({ children, entity }) => {
          return (
            <div
              onClick={(e) => {
                e.stopPropagation();

                setSelectedEntityId(entity.id);
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
              </div>
            </div>
          );
        }}
      </Builder.Entities>
      <Builder.Inputs
        {...client}
        entityId={selectedEntityId}
        inputsComponents={{
          text: {
            visibleWhen: visibleWhenComponent,
            label: labelComponent,
          },
        }}
      />
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
              client.inputsValidationStore.setSerializedData(
                res.reason.payload,
              );

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
