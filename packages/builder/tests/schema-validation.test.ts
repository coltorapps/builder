import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createBuilder, createEntity, createInput } from "../src";
import {
  SchemaValidationError,
  schemaValidationErrorCodes,
  type SchemaValidationErrorCause,
} from "../src/errors";
import { validateSchema } from "../src/schema-validation";
import { type BaseBuilder, type Schema } from "../src/store";

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
          entities: {},
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
              inputs: {},
              parentId: null,
            },
          },
          root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
        errorCause: {
          code: schemaValidationErrorCodes.InvalidParentId,
          entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
          entityParentId: null,
        },
      },
      {
        schema: {
          entities: {
            "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
              type: "text",
              inputs: {},
              parentId: "0885af6f-5033-414d-ac95-38ea78a9438c",
            },
          },
          root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
        errorCause: {
          code: schemaValidationErrorCodes.MissingEntityParent,
          entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
          entityParentId: "0885af6f-5033-414d-ac95-38ea78a9438c",
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
      {
        schema: {
          entities: {
            "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
              type: "text",
              inputs: {},
              parentId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
            },
          },
          root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
        errorCause: {
          code: schemaValidationErrorCodes.CircularEntityReference,
          entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
        },
      },
    ];

    for (const item of schemas) {
      try {
        validateSchema(item.schema as Schema<BaseBuilder>, builder);

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

    const result = validateSchema(
      {
        entities: {
          "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
            ...cleanEntity,
            dirty: "should be removed",
          },
        },
        root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
      } as Schema<BaseBuilder>,
      builder,
    );

    expect(result).toEqual({
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": cleanEntity,
      },
      root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
    } as Schema<BaseBuilder>);
  });
});
