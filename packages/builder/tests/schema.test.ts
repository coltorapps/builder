import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createAttribute, createBuilder, createEntity } from "../src";
import {
  schemaParsingErrorCodes,
  validateSchema,
  parseSchema,
  type ParsedSchema,
  type SchemaParsingErrorReason,
} from "../src/schema";

const invalidSchemasCases: Array<{
  schema: unknown;
  reason: SchemaParsingErrorReason;
}> = [
  {
    schema: {
      entities: {},
    },
    reason: {
      code: schemaParsingErrorCodes.InvalidRootFormat,
      payload: {},
    },
  },
  {
    schema: {
      entities: {},
      root: {},
    },
    reason: {
      code: schemaParsingErrorCodes.InvalidRootFormat,
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
      code: schemaParsingErrorCodes.InvalidRootFormat,
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
      code: schemaParsingErrorCodes.DuplicateRootId,
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
      code: schemaParsingErrorCodes.EmptyRoot,
    },
  },
  {
    schema: {
      entities: {},
      root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
    },
    reason: {
      code: schemaParsingErrorCodes.NonexistentEntityId,
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
      code: schemaParsingErrorCodes.InvalidEntitiesFormat,
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
      code: schemaParsingErrorCodes.InvalidEntitiesFormat,
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
      code: schemaParsingErrorCodes.MissingEntityType,
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
      code: schemaParsingErrorCodes.UnknownEntityType,
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
      code: schemaParsingErrorCodes.MissingEntityAttributes,
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
      code: schemaParsingErrorCodes.InvalidEntityAttributesFormat,
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
      code: schemaParsingErrorCodes.UnknownEntityAttributeType,
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
      code: schemaParsingErrorCodes.NonexistentEntityParent,
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
      code: schemaParsingErrorCodes.SelfEntityReference,
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
      code: schemaParsingErrorCodes.InvalidChildrenFormat,
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
      code: schemaParsingErrorCodes.ChildNotAllowed,
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
      code: schemaParsingErrorCodes.RootEntityWithParent,
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
      code: schemaParsingErrorCodes.EntityChildrenMismatch,
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
      code: schemaParsingErrorCodes.DuplicateChildId,
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
      code: schemaParsingErrorCodes.EntityParentMismatch,
      payload: {
        entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
        parentId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
      },
    },
  },
  {
    schema: {
      entities: {
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "select",
          attributes: {},
        },
      },
      root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
    },
    reason: {
      code: schemaParsingErrorCodes.ParentRequired,
      payload: {
        entityId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
      },
    },
  },
  {
    schema: {
      entities: {
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "select",
          attributes: {},
          parentId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
        },
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          type: "card",
          attributes: {},
          children: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
      },
      root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
    },
    reason: {
      code: schemaParsingErrorCodes.ParentNotAllowed,
      payload: {
        entityId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
        parentId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
      },
    },
  },
];

describe("schema shape validation", () => {
  it("fails for invalid schemas", () => {
    const builder = createBuilder({
      entities: {
        text: createEntity({
          attributes: {
            label: createAttribute({
              validate(value) {
                return value;
              },
            }),
          },
        }),
        section: createEntity(),
        card: createEntity({
          childrenAllowed: true,
        }),
        select: createEntity({
          parentRequired: true,
        }),
      },
      entitiesExtensions: {
        section: {
          childrenAllowed: ["text", "section"],
        },
        select: {
          allowedParents: ["section"],
        },
      },
    });

    for (const item of invalidSchemasCases) {
      const result = parseSchema(item.schema as ParsedSchema, builder);

      expect(result).toEqual({
        success: false,
        reason: item.reason,
      });
    }
  });

  it("returns the validated schema", () => {
    const builder = createBuilder({
      entities: {
        text: createEntity({
          attributes: {
            label: createAttribute({
              validate(value) {
                return z.string().parse(value) + "should be appended";
              },
            }),
          },
        }),
      },
    });

    expect(
      parseSchema(
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
      entities: {
        text: createEntity(),
      },
    });

    expect(() =>
      parseSchema(
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
      entities: {
        text: createEntity({
          childrenAllowed: true,
        }),
      },
    });

    expect(() =>
      parseSchema(
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
      entities: {
        text: createEntity(),
      },
    });

    expect(() =>
      parseSchema(
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
      attributes: {
        label: createAttribute({
          validate(value) {
            return value;
          },
        }),
      },
    });

    const sectionEntity = createEntity({
      childrenAllowed: true,
    });

    const builder = createBuilder({
      entities: { text: textEntity, section: sectionEntity },
    });

    const schema: ParsedSchema = {
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

    expect(parseSchema(schema, builder)).toMatchSnapshot();
  });
});

describe("schema validation", () => {
  it("fails for invalid schemas", async () => {
    const builder = createBuilder({
      entities: {
        text: createEntity({
          attributes: {
            label: createAttribute({
              validate(value) {
                return value;
              },
            }),
          },
        }),
        section: createEntity(),
        card: createEntity({
          childrenAllowed: true,
        }),
        select: createEntity({
          parentRequired: true,
        }),
      },
      entitiesExtensions: {
        section: {
          childrenAllowed: ["text", "section"],
        },
        select: {
          allowedParents: ["section"],
        },
      },
      validateSchema(schema) {
        if (
          Object.values(schema.entities).some(
            (entity) =>
              entity.type === "text" &&
              entity.attributes.label === "should fail",
          )
        ) {
          throw "Label validation failed";
        }

        return schema;
      },
    });

    for (const item of invalidSchemasCases) {
      const result = await validateSchema(item.schema as ParsedSchema, builder);

      expect(result).toEqual({
        success: false,
        reason: item.reason,
      });
    }
  });

  it("validates the schema with the custom validator", async () => {
    const builder = createBuilder({
      entities: {
        text: createEntity({
          attributes: {
            label: createAttribute({
              validate(value) {
                return value as string;
              },
            }),
          },
        }),
      },
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
        code: schemaParsingErrorCodes.InvalidSchema,
        payload: {
          schemaError: "Label validation failed",
        },
      },
    });
  });

  it("validates attributes with their validators", async () => {
    const builder = createBuilder({
      entities: {
        text: createEntity({
          attributes: {
            label: createAttribute({
              validate(value) {
                return z.string().parse(value);
              },
            }),
            description: createAttribute({
              validate(value) {
                return z.string().parse(value);
              },
            }),
          },
        }),
      },
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
