import { describe, expect, it } from "vitest";

import { createBuilder, createEntity, createInput } from "../src";
import {
  SchemaValidationError,
  schemaValidationErrorCodes,
  validateSchema,
  type Schema,
  type SchemaValidationErrorCause,
} from "../src/schema";

describe("schema validation", () => {
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
          code: schemaValidationErrorCodes.MissingEntityParent,
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
              children: [],
            },
          },
          root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
        errorCause: {
          code: schemaValidationErrorCodes.ChildrenNotAllowed,
          entityId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
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
          root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
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
          root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
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

    for (const item of schemas) {
      try {
        validateSchema(builder, item.schema as Schema);

        throw new Error("Unhandled case. Fix the implementation.");
      } catch (e) {
        expect(e).toBeInstanceOf(SchemaValidationError);

        expect((e as SchemaValidationError).cause).toEqual(item.errorCause);
      }
    }
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
      validateSchema(builder, {
        entities: {
          "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
            type: "text",
            inputs: {},
            // @ts-expect-error Intentional wrong data type.
            parentId: 1,
          },
        },
        root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
      }),
    ).toThrowErrorMatchingInlineSnapshot("\"The entity id '1' is invalid.\"");
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
      validateSchema(builder, {
        entities: {
          "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
            type: "text",
            inputs: {},
            // @ts-expect-error Intentional wrong data type.
            children: [1],
          },
        },
        root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
      }),
    ).toThrowErrorMatchingInlineSnapshot("\"The entity id '1' is invalid.\"");
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
      validateSchema(builder, {
        entities: {
          "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
            type: "text",
            inputs: {},
          },
        },
        // @ts-expect-error Intentional wrong data type.
        root: [1],
      }),
    ).toThrowErrorMatchingInlineSnapshot("\"The entity id '1' is invalid.\"");
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

    const cleanEntity = {
      type: "text",
      inputs: {
        label: "test",
      },
      parentId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
    };

    const result = validateSchema(builder, {
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          ...cleanEntity,
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
    });

    expect(result).toEqual({
      entities: {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": cleanEntity,
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "section",
          inputs: {},
          children: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
      },
      root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
    });
  });

  it("returns an empty schema when no input schema was provided", () => {
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

    const builder = createBuilder({
      entities: [textEntity],
    });

    const result = validateSchema(builder);

    expect(result).toEqual({
      entities: {},
      root: [],
    });
  });
});
