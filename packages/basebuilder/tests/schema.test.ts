import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createAttribute, createBuilder, createEntity } from "../src";
import {
  schemaValidationErrorCodes,
  validateSchema,
  validateSchemaIntegrity,
  type Schema,
  type SchemaValidationErrorReason,
} from "../src/schema";

const invalidSchemasCases: Array<{
  schema: unknown;
  reason: SchemaValidationErrorReason;
}> = [
  {
    schema: {
      entities: {},
    },
    reason: {
      code: schemaValidationErrorCodes.InvalidRootFormat,
      payload: {},
    },
  },
  {
    schema: {
      entities: {},
      root: {},
    },
    reason: {
      code: schemaValidationErrorCodes.InvalidRootFormat,
      payload: {
        root: {},
      },
    },
  },
  {
    schema: {
      entities: {},
      root: null,
    },
    reason: {
      code: schemaValidationErrorCodes.InvalidRootFormat,
      payload: {
        root: null,
      },
    },
  },
  {
    schema: {
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          type: "text",
          attributes: {},
        },
      },
      root: [
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
      ],
    },
    reason: {
      code: schemaValidationErrorCodes.DuplicateRootId,
      payload: {
        entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
      },
    },
  },
  {
    schema: {
      entities: {
        entities: {
          "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
            type: "text",
            attributes: {},
          },
        },
      },
      root: [],
    },
    reason: {
      code: schemaValidationErrorCodes.EmptyRoot,
    },
  },
  {
    schema: {
      entities: {},
      root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
    },
    reason: {
      code: schemaValidationErrorCodes.NonexistentEntityId,
      payload: {
        entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
      },
    },
  },
  {
    schema: {
      entities: [],
      root: [],
    },
    reason: {
      code: schemaValidationErrorCodes.InvalidEntitiesFormat,
      payload: {
        entities: [],
      },
    },
  },
  {
    schema: {
      entities: null,
      root: [],
    },
    reason: {
      code: schemaValidationErrorCodes.InvalidEntitiesFormat,
      payload: {
        entities: null,
      },
    },
  },
  {
    schema: {
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          attributes: {},
        },
      },
      root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
    },
    reason: {
      code: schemaValidationErrorCodes.MissingEntityType,
      payload: {
        entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
      },
    },
  },
  {
    schema: {
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          type: "invalid",
          attributes: {},
        },
      },
      root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
    },
    reason: {
      code: schemaValidationErrorCodes.UnknownEntityType,
      payload: {
        entityType: "invalid",
        entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
      },
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
    reason: {
      code: schemaValidationErrorCodes.MissingEntityAttributes,
      payload: {
        entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
      },
    },
  },
  {
    schema: {
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          type: "text",
          attributes: [],
        },
      },
      root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
    },
    reason: {
      code: schemaValidationErrorCodes.InvalidEntityAttributesFormat,
      payload: {
        entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
        entityAttributes: [],
      },
    },
  },
  {
    schema: {
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          type: "text",
          attributes: {
            invalid: "test",
          },
        },
      },
      root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
    },
    reason: {
      code: schemaValidationErrorCodes.UnknownEntityAttributeType,
      payload: {
        entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
        attributeName: "invalid",
      },
    },
  },
  {
    schema: {
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          type: "text",
          parentId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
          attributes: {},
        },
      },
      root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
    },
    reason: {
      code: schemaValidationErrorCodes.NonexistentEntityParent,
      payload: {
        entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
        entityParentId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
      },
    },
  },
  {
    schema: {
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          type: "text",
          parentId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
          attributes: {},
        },
      },
      root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
    },
    reason: {
      code: schemaValidationErrorCodes.SelfEntityReference,
      payload: {
        entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
      },
    },
  },
  {
    schema: {
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          type: "text",
          attributes: {},
          children: "invalid",
        },
      },
      root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
    },
    reason: {
      code: schemaValidationErrorCodes.InvalidChildrenFormat,
      payload: {
        entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
      },
    },
  },
  {
    schema: {
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          type: "text",
          attributes: {},
          children: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "text",
          attributes: {},
          parentId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
        },
      },
      root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
    },
    reason: {
      code: schemaValidationErrorCodes.ChildNotAllowed,
      payload: {
        entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
        childId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
      },
    },
  },
  {
    schema: {
      entities: {
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "section",
          attributes: {},
          parentId: "a1109529-46c6-4290-885b-bb0aca7a92a1",
        },
        "a1109529-46c6-4290-885b-bb0aca7a92a1": {
          type: "section",
          attributes: {},
          children: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
      },
      root: [
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "a1109529-46c6-4290-885b-bb0aca7a92a1",
      ],
    },
    reason: {
      code: schemaValidationErrorCodes.RootEntityWithParent,
      payload: {
        entityId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
      },
    },
  },
  {
    schema: {
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          type: "text",
          attributes: {},
        },
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "section",
          attributes: {},
          children: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
      },
      root: [
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
      ],
    },
    reason: {
      code: schemaValidationErrorCodes.EntityChildrenMismatch,
      payload: {
        entityId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
        childId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
      },
    },
  },
  {
    schema: {
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          type: "text",
          attributes: {},
          parentId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
        },
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "section",
          attributes: {},
          children: [
            "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
            "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
          ],
        },
      },
      root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
    },
    reason: {
      code: schemaValidationErrorCodes.DuplicateChildId,
      payload: {
        entityId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
      },
    },
  },
  {
    schema: {
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          type: "text",
          attributes: {},
          parentId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
        },
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "section",
          attributes: {},
          children: ["a1109529-46c6-4290-885b-bb0aca7a92a1"],
        },
        "a1109529-46c6-4290-885b-bb0aca7a92a1": {
          type: "section",
          attributes: {},
        },
      },
      root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
    },
    reason: {
      code: schemaValidationErrorCodes.EntityParentMismatch,
      payload: {
        entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
        parentId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
      },
    },
  },
];

describe("schema integrity validation", () => {
  it("fails for invalid schemas", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          attributes: [
            createAttribute({
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
      parentRequired: ["select"],
      entitiesExtensions: {
        section: {
          childrenAllowed: ["text", "section"],
        },
      },
    });

    for (const item of invalidSchemasCases) {
      const result = validateSchemaIntegrity(item.schema as Schema, builder);

      expect(result).toEqual({
        success: false,
        reason: item.reason,
      });
    }
  });

  it("returns the validated schema", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          attributes: [
            createAttribute({
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
              attributes: {},
            },
          },
          root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
        builder,
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
              attributes: {},
              parentId: 1,
            },
          },
          root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
        builder,
      ),
    ).toThrowErrorMatchingSnapshot();
  });

  it("throws for invalid children ids", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          childrenAllowed: true,
        }),
      ],
    });

    expect(() =>
      validateSchemaIntegrity(
        {
          entities: {
            "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
              type: "text",
              attributes: {},
              children: [1],
            },
          },
          root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
        builder,
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
              attributes: {},
            },
          },
          root: [1, "c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
        builder,
      ),
    ).toThrowErrorMatchingSnapshot();
  });

  it("returns clean data for valid schemas", () => {
    const textEntity = createEntity({
      name: "text",
      attributes: [
        createAttribute({
          name: "label",
          validate(value) {
            return value;
          },
        }),
      ],
    });

    const sectionEntity = createEntity({
      name: "section",
      childrenAllowed: true,
    });

    const builder = createBuilder({
      entities: [textEntity, sectionEntity],
    });

    const schema: Schema = {
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          type: "text",
          attributes: {
            label: "test",
          },
          parentId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
          // @ts-expect-error Intentionally redundant property.
          dirty: "should be removed after validation",
        },
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "section",
          attributes: {},
          children: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
      },
      root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
    };

    expect(validateSchemaIntegrity(schema, builder)).toMatchSnapshot();
  });
});

describe("schema validation", () => {
  it("fails for invalid schemas", async () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          attributes: [
            createAttribute({
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
      entitiesExtensions: {
        section: {
          childrenAllowed: ["text", "section"],
        },
      },
      parentRequired: ["select"],
      validateSchema(schema) {
        if (
          Object.values(schema.entities).some(
            (entity) => entity.attributes.label === "should fail",
          )
        ) {
          throw "Label validation failed";
        }

        return schema;
      },
    });

    for (const item of invalidSchemasCases) {
      const result = await validateSchema(item.schema as Schema, builder);

      expect(result).toEqual({
        success: false,
        reason: item.reason,
      });
    }
  });

  it("validates the schema with the custom validator", async () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          attributes: [
            createAttribute({
              name: "label",
              validate(value) {
                return value;
              },
            }),
          ],
        }),
      ],
      validateSchema(schema) {
        if (
          Object.values(schema.entities).some(
            (entity) => entity.attributes.label === "should fail",
          )
        ) {
          throw "Label validation failed";
        }

        return schema;
      },
    });

    const result = await validateSchema(
      {
        entities: {
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            type: "text",
            attributes: {
              label: "should fail",
            },
          },
        },
        root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
      },
      builder,
    );

    expect(result).toEqual({
      success: false,
      reason: {
        code: schemaValidationErrorCodes.InvalidSchema,
        payload: {
          schemaError: "Label validation failed",
        },
      },
    });
  });

  it("validates attributes with their validators", async () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          attributes: [
            createAttribute({
              name: "label",
              validate(value) {
                return z.string().parse(value);
              },
            }),
            createAttribute({
              name: "description",
              validate(value) {
                return z.string().parse(value);
              },
            }),
          ],
        }),
      ],
      entitiesExtensions: {
        text: {
          attributes: {
            description: {
              validate(value) {
                return z.string().min(1).parse(value);
              },
            },
          },
        },
      },
    });

    const result = await validateSchema(
      {
        entities: {
          "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
            type: "text",
            attributes: {
              label: 1,
              description: "1",
            },
          },
          "4b9ed44b-0e4d-41e9-ad73-1ee70e8fefcb": {
            type: "text",
            attributes: {
              label: 1,
              description: "",
            },
          },
        },
        root: [
          "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
          "4b9ed44b-0e4d-41e9-ad73-1ee70e8fefcb",
        ],
      },
      builder,
    );

    expect(result).toMatchSnapshot();

    expect(
      (result as unknown as Record<string, Record<string, unknown>>).reason
        ?.payload,
    ).toMatchSnapshot();
  });
});
