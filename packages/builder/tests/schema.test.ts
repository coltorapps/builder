import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createBuilder, createEntity, createInput } from "../src";
import {
  baseValidateSchema,
  SchemaValidationError,
  schemaValidationErrorCodes,
  validateSchema,
  type Schema,
  type SchemaValidationErrorCause,
} from "../src/schema";

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

    for (const item of schemas) {
      try {
        await validateSchema(builder, item.schema as Schema);

        throw new Error("Unhandled case. Fix the implementation.");
      } catch (e) {
        expect(e).toBeInstanceOf(SchemaValidationError);

        expect((e as SchemaValidationError).cause).toEqual(item.errorCause);
      }
    }

    for (const item of schemas) {
      try {
        baseValidateSchema(builder, item.schema as Schema);

        throw new Error("Unhandled case. Fix the implementation.");
      } catch (e) {
        expect(e).toBeInstanceOf(SchemaValidationError);

        expect((e as SchemaValidationError).cause).toEqual(item.errorCause);
      }
    }
  });

  it("validates the inputs with the async validator and skips inputs validators with the sync validator", async () => {
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

    await expect(
      validateSchema(builder, {
        entities: {
          "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
            type: "text",
            // @ts-expect-error Intentional wrong data type.
            inputs: {},
          },
        },
        root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
      }),
    ).rejects.toThrowErrorMatchingSnapshot();

    await expect(
      validateSchema(builder, {
        entities: {
          "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
            type: "text",
            inputs: {
              label: "test",
            },
          },
        },
        root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
      }),
    ).resolves.toMatchSnapshot();

    expect(
      baseValidateSchema(builder, {
        entities: {
          "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
            type: "text",
            // @ts-expect-error Intentional wrong data type.
            inputs: {},
          },
        },
        root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
      }),
    ).toMatchSnapshot();
  });

  it("throws for invalid parent id", async () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
        }),
      ],
    });

    await expect(
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
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  it("throws for invalid children ids", async () => {
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

    await expect(
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
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  it("throws for invalid root ids", async () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
        }),
      ],
    });

    await expect(
      validateSchema(builder, {
        entities: {
          "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
            type: "text",
            inputs: {},
          },
        },
        // @ts-expect-error Intentional wrong data type.
        root: [1, "c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
      }),
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  it("returns clean data for valid schemas", async () => {
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

    await expect(validateSchema(builder, schema)).resolves.toMatchSnapshot();
  });

  it("returns an empty schema when no input schema was provided", async () => {
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

    await expect(validateSchema(builder)).resolves.toMatchSnapshot();
  });
});
