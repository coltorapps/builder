import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createBuilder, createEntity, createInput } from "../src";
import {
  SchemaValidationError,
  schemaValidationErrorCodes,
  type SchemaValidationErrorCause,
} from "../src/errors";
import { type Schema } from "../src/store";
import { validateSchema } from "../src/store-validation";

const textEntity = createEntity({
  name: "text",
  inputs: [
    createInput({
      name: "label",
      validate(value) {
        return z.string().optional().parse(value);
      },
    }),
  ],
});

const builder = createBuilder({
  entities: [textEntity],
});

describe("schema validation", () => {
  it("throws for invalid schemas", () => {
    const schemas: Array<{
      schema: unknown;
      errorCause: SchemaValidationErrorCause;
    }> = [
      {
        schema: {
          entities: {},
        },
        errorCause: {
          code: schemaValidationErrorCodes.InvalidRootFormat,
        },
      },
      {
        schema: {
          entities: {},
          root: {},
        },
        errorCause: {
          code: schemaValidationErrorCodes.InvalidRootFormat,
          root: {},
        },
      },
      {
        schema: {
          entities: {},
          root: null,
        },
        errorCause: {
          code: schemaValidationErrorCodes.InvalidRootFormat,
          root: null,
        },
      },
      {
        schema: {
          entities: {
            "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
              type: "text",
              inputs: {},
            },
          },
          root: [
            "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
            "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
          ],
        },
        errorCause: {
          code: schemaValidationErrorCodes.DuplicateRootId,
          entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
        },
      },
      {
        schema: {
          entities: {
            entities: {
              "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
                type: "text",
                inputs: {},
              },
            },
          },
          root: [],
        },
        errorCause: {
          code: schemaValidationErrorCodes.EmptyRoot,
        },
      },
      {
        schema: {
          entities: {},
          root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
        errorCause: {
          code: schemaValidationErrorCodes.MissingEntityId,
          entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
        },
      },
      {
        schema: {
          entities: [],
          root: [],
        },
        errorCause: {
          code: schemaValidationErrorCodes.InvalidEntitiesFormat,
          entities: [],
        },
      },
      {
        schema: {
          entities: null,
          root: [],
        },
        errorCause: {
          code: schemaValidationErrorCodes.InvalidEntitiesFormat,
          entities: null,
        },
      },
      {
        schema: {
          entities: {
            "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
              inputs: {},
            },
          },
          root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
        errorCause: {
          code: schemaValidationErrorCodes.MissingEntityType,
          entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
        },
      },
      {
        schema: {
          entities: {
            "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
              type: "invalid",
              inputs: {},
            },
          },
          root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
        errorCause: {
          code: schemaValidationErrorCodes.UnknownEntityType,
          entityType: "invalid",
          entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
        },
      },
      {
        schema: {
          entities: {
            "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
              type: "text",
            },
          },
          root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
        errorCause: {
          code: schemaValidationErrorCodes.MissingEntityInputs,
          entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
        },
      },
      {
        schema: {
          entities: {
            "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
              type: "text",
              inputs: [],
            },
          },
          root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
        errorCause: {
          code: schemaValidationErrorCodes.InvalidEntityInputsFormat,
          entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
          entityInputs: [],
        },
      },
      {
        schema: {
          entities: {
            "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
              type: "text",
              inputs: {
                invalid: "test",
              },
            },
          },
          root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
        errorCause: {
          code: schemaValidationErrorCodes.UnknownEntityInputType,
          entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
          inputName: "invalid",
        },
      },
      // handle circular reference
    ];

    for (const item of schemas) {
      try {
        validateSchema(item.schema as Schema, builder);

        throw new Error("Unhandled case. Fix the implementation.");
      } catch (e) {
        expect(e).toBeInstanceOf(SchemaValidationError);

        expect((e as SchemaValidationError).cause).toEqual(item.errorCause);
      }
    }
  });

  it("returns clean data for valid schemas", () => {
    const cleanEntity = {
      type: "text",
      inputs: {
        label: "test",
      },
    };

    const id = "c1ab14a4-41db-4531-9a58-4825a9ef6d26";

    const result = validateSchema(
      {
        entities: {
          [id]: {
            ...cleanEntity,
            // @ts-expect-error Intentionally redundant property.
            dirty: "should be removed after validation",
          },
        },
        root: [id],
      },
      builder,
    );

    expect(result).toEqual({
      entities: {
        [id]: cleanEntity,
      },
      root: [id],
    });
  });
});
