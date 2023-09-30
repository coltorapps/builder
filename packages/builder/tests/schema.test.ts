import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createBuilder, createEntity, createInput } from "../src";
import {
  SchemaValidationError,
  schemaValidationErrorCodes,
  validateSchema,
  validateSchemaIntegrity,
  type Schema,
  type SchemaValidationErrorCause,
} from "../src/schema";

const invalidSchemasCases: Array<{
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
      code: schemaValidationErrorCodes.NonexistentEntityId,
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
  {
    schema: {
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          type: "text",
          parentId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
          inputs: {},
        },
      },
      root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
    },
    errorCause: {
      code: schemaValidationErrorCodes.NonexistentEntityParent,
      entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
      entityParentId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
    },
  },
  {
    schema: {
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          type: "text",
          parentId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
          inputs: {},
        },
      },
      root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
    },
    errorCause: {
      code: schemaValidationErrorCodes.SelfEntityReference,
      entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
    },
  },
  {
    schema: {
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          type: "text",
          inputs: {},
          children: "invalid",
        },
      },
      root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
    },
    errorCause: {
      code: schemaValidationErrorCodes.InvalidChildrenFormat,
      entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
    },
  },
  {
    schema: {
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          type: "text",
          inputs: {},
          children: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "text",
          inputs: {},
          parentId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
        },
      },
      root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
    },
    errorCause: {
      code: schemaValidationErrorCodes.ChildNotAllowed,
      entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
      childId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
    },
  },
  {
    schema: {
      entities: {
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "section",
          inputs: {},
          parentId: "a1109529-46c6-4290-885b-bb0aca7a92a1",
        },
        "a1109529-46c6-4290-885b-bb0aca7a92a1": {
          type: "section",
          inputs: {},
          children: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
      },
      root: [
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "a1109529-46c6-4290-885b-bb0aca7a92a1",
      ],
    },
    errorCause: {
      code: schemaValidationErrorCodes.RootEntityWithParent,
      entityId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
    },
  },
  {
    schema: {
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          type: "text",
          inputs: {},
        },
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "section",
          inputs: {},
          children: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
      },
      root: [
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
      ],
    },
    errorCause: {
      code: schemaValidationErrorCodes.EntityChildrenMismatch,
      entityId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
      childId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
    },
  },
  {
    schema: {
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          type: "text",
          inputs: {},
          parentId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
        },
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "section",
          inputs: {},
          children: [
            "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
            "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
          ],
        },
      },
      root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
    },
    errorCause: {
      code: schemaValidationErrorCodes.DuplicateChildId,
      entityId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
    },
  },
  {
    schema: {
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          type: "text",
          inputs: {},
          parentId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
        },
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "section",
          inputs: {},
          children: ["a1109529-46c6-4290-885b-bb0aca7a92a1"],
        },
        "a1109529-46c6-4290-885b-bb0aca7a92a1": {
          type: "section",
          inputs: {},
        },
      },
      root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
    },
    errorCause: {
      code: schemaValidationErrorCodes.EntityParentMismatch,
      entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
      parentId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
    },
  },
  {
    schema: {
      entities: {
        "a1109529-46c6-4290-885b-bb0aca7a92a1": {
          type: "select",
          inputs: {},
        },
      },
      root: ["a1109529-46c6-4290-885b-bb0aca7a92a1"],
    },
    errorCause: {
      code: schemaValidationErrorCodes.ParentRequired,
      entityId: "a1109529-46c6-4290-885b-bb0aca7a92a1",
    },
  },
];

describe("schema integrity validation", () => {
  it("throws for invalid schemas", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          inputs: [
            createInput({
              name: "label",
              validate(value) {
                return value;
              },
            }),
          ],
        }),
        createEntity({
          name: "section",
        }),
        createEntity({
          name: "select",
        }),
      ],
      childrenAllowed: {
        section: ["text", "section"],
      },
      parentRequired: ["select"],
    });

    for (const item of invalidSchemasCases) {
      const result = validateSchemaIntegrity(item.schema as Schema, {
        builder,
      });

      expect(result).toEqual({
        success: false,
        error: new SchemaValidationError(item.errorCause),
      });
    }
  });

  it("returns the validated schema", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          inputs: [
            createInput({
              name: "label",
              validate(value) {
                return z.string().parse(value) + "should be appended";
              },
            }),
          ],
        }),
      ],
    });

    expect(
      validateSchemaIntegrity(
        {
          entities: {
            "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
              type: "text",
              // @ts-expect-error Intentional wrong data type.
              inputs: {},
            },
          },
          root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
        {
          builder,
        },
      ),
    ).toMatchSnapshot();
  });

  it("throws for invalid parent id", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
        }),
      ],
    });

    expect(() =>
      validateSchemaIntegrity(
        {
          entities: {
            "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
              type: "text",
              inputs: {},
              // @ts-expect-error Intentional wrong data type.
              parentId: 1,
            },
          },
          root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
        {
          builder,
        },
      ),
    ).toThrowErrorMatchingSnapshot();
  });

  it("throws for invalid children ids", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
        }),
      ],
      childrenAllowed: {
        text: true,
      },
    });

    expect(() =>
      validateSchemaIntegrity(
        {
          entities: {
            "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
              type: "text",
              inputs: {},
              // @ts-expect-error Intentional wrong data type.
              children: [1],
            },
          },
          root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
        {
          builder,
        },
      ),
    ).toThrowErrorMatchingSnapshot();
  });

  it("throws for invalid root ids", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
        }),
      ],
    });

    expect(() =>
      validateSchemaIntegrity(
        {
          entities: {
            "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
              type: "text",
              inputs: {},
            },
          },
          // @ts-expect-error Intentional wrong data type.
          root: [1, "c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
        {
          builder,
        },
      ),
    ).toThrowErrorMatchingSnapshot();
  });

  it("returns clean data for valid schemas", () => {
    const textEntity = createEntity({
      name: "text",
      inputs: [
        createInput({
          name: "label",
          validate(value) {
            return value;
          },
        }),
      ],
    });

    const sectionEntity = createEntity({
      name: "section",
    });

    const builder = createBuilder({
      entities: [textEntity, sectionEntity],
      childrenAllowed: {
        section: true,
      },
    });

    const schema: Schema = {
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          type: "text",
          inputs: {
            label: "test",
          },
          parentId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
          // @ts-expect-error Intentionally redundant property.
          dirty: "should be removed after validation",
        },
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "section",
          inputs: {},
          children: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
      },
      root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
    };

    expect(validateSchemaIntegrity(schema, { builder })).toMatchSnapshot();
  });
});

describe("schema validation", () => {
  it("throws for invalid schemas", async () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          inputs: [
            createInput({
              name: "label",
              validate(value) {
                return value;
              },
            }),
          ],
        }),
        createEntity({
          name: "section",
        }),
        createEntity({
          name: "select",
        }),
      ],
      childrenAllowed: {
        section: ["text", "section"],
      },
      parentRequired: ["select"],
    });

    for (const item of invalidSchemasCases) {
      const result = await validateSchema(item.schema as Schema, { builder });

      expect(result).toEqual({
        success: false,
        error: new SchemaValidationError(item.errorCause),
      });
    }
  });

  it("validates inputs with their validators", async () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          inputs: [
            createInput({
              name: "label",
              validate(value) {
                return z.string().parse(value);
              },
            }),
          ],
        }),
      ],
    });

    const result = await validateSchema(
      {
        entities: {
          "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
            type: "text",
            inputs: {
              // @ts-expect-error Intentional wrong data type
              label: 1,
            },
          },
          "4b9ed44b-0e4d-41e9-ad73-1ee70e8fefcb": {
            type: "text",
            inputs: {
              // @ts-expect-error Intentional wrong data type
              label: 1,
            },
          },
        },
        root: [
          "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
          "4b9ed44b-0e4d-41e9-ad73-1ee70e8fefcb",
        ],
      },
      { builder },
    );

    expect(result).toMatchSnapshot();

    expect(
      ((result as Record<string, unknown>).error as Record<string, unknown>)
        .cause,
    ).toMatchSnapshot();
  });
});
