import { randomUUID } from "crypto";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createAttributeDefinition } from "../src/attribute-definition";
import { createBuilder } from "../src/builder";
import { createEntityDefinition } from "../src/entity-definition";
import { SchemaParseError } from "../src/schema-parsing";
import {
  EntitiesAttributesValidationError,
  SchemaRefineError,
  validateSchema,
} from "../src/schema-validation";
import { assertErrorResult, dataResultAsValueResult } from "./utils";

describe("schema validation", () => {
  const builder = createBuilder({
    entities: {
      textField: createEntityDefinition({
        attributes: {
          stringMin10: createAttributeDefinition(
            {
              parse: (value) => {
                return dataResultAsValueResult(z.string().safeParse(value));
              },
            },
            {
              refine: (value) => {
                return dataResultAsValueResult(
                  z
                    .string()
                    .min(10)
                    .refine(
                      (value) => value !== "refine will fail",
                      "refine failed",
                    )
                    .safeParse(value),
                );
              },
            },
          ),
          transformedString: createAttributeDefinition(
            {
              parse: (value) => {
                return dataResultAsValueResult(
                  z
                    .string()
                    .transform((value) => value + "-parseTransform")
                    .safeParse(value),
                );
              },
            },
            {
              refine: (value) => {
                return dataResultAsValueResult(
                  z
                    .string()
                    .transform((value) => value + "-refineTransform")
                    .safeParse(value),
                );
              },
            },
          ),
          overridenEmail: createAttributeDefinition(
            {
              parse: (value) => {
                return dataResultAsValueResult(z.string().safeParse(value));
              },
            },
            {
              refine: (value) => {
                return dataResultAsValueResult(
                  z
                    .string()
                    .transform((value) => "refineTransform-" + value)
                    .safeParse(value),
                );
              },
            },
          ),
        },
        attributeOverrides: {
          overridenEmail: {
            async refine(value, ctx) {
              const result = await ctx.refine(value);

              if (!result.success) {
                return result;
              }

              return dataResultAsValueResult(
                z
                  .string()
                  .email()
                  .transform(
                    (value) =>
                      value + (ctx.entity.attributes.stringMin10.value || ""),
                  )
                  .safeParse(result.value),
              );
            },
          },
        },
      }),
    },
    entityOverrides: {
      textField: {
        attributes: {
          overridenEmail: {
            async refine(entity, ctx) {
              const result = await ctx.refine(entity);

              if (!result.success) {
                return result;
              }

              return {
                success: true,
                value: result.value + "-entityOverride",
              };
            },
          },
        },
      },
    },
    refineSchema(schema) {
      if (
        schema.entities[uuid]?.attributes.stringMin10 ===
        "schema refine will fail"
      ) {
        return {
          success: false,
          error: "refine error",
        };
      }

      return {
        success: true,
        value: schema,
      };
    },
  });

  const uuid = randomUUID();

  describe("success cases", () => {
    it.each([
      {
        description: "attributes parsing and refining pass",
        schema: {
          root: [uuid],
          entities: {
            [uuid]: {
              type: "textField",
              attributes: {
                stringMin10: "stringMin10",
                transformedString: "1234567890",
                overridenEmail: "my@email.com",
              },
            },
          },
        },
        expectedResult: {
          entities: {
            [uuid]: {
              type: "textField",
              attributes: {
                stringMin10: "stringMin10",
                transformedString: "1234567890-parseTransform-refineTransform",
                overridenEmail:
                  "refineTransform-my@email.comstringMin10-entityOverride",
              },
            },
          },
          root: [uuid],
        },
      },
      {
        description: "schema refining passes",
        schema: {
          root: [uuid],
          entities: {
            [uuid]: {
              type: "textField",
              attributes: {
                stringMin10: "1234567890",
                transformedString: "1234567890",
                overridenEmail: "my@email.com",
              },
            },
          },
        },
        expectedResult: {
          entities: {
            [uuid]: {
              attributes: {
                overridenEmail:
                  "refineTransform-my@email.com1234567890-entityOverride",
                stringMin10: "1234567890",
                transformedString: "1234567890-parseTransform-refineTransform",
              },
              type: "textField",
            },
          },
          root: [uuid],
        },
      },
    ] as const)(
      "should succeed when $description",
      async ({ schema, expectedResult }) => {
        expect(await validateSchema(schema, builder)).toStrictEqual({
          success: true,
          value: expectedResult,
        });
      },
    );
  });

  describe("failure cases", () => {
    it.each([
      {
        description: "invalid schema provided",
        schema: {},
        expectedError: {
          instance: SchemaParseError,
        },
      },
      {
        description: "schema refining fails",
        schema: {
          root: [uuid],
          entities: {
            [uuid]: {
              type: "textField",
              attributes: {
                stringMin10: "schema refine will fail",
                transformedString: "1234567890",
                overridenEmail: "my@email.com",
              },
            },
          },
        },
        expectedError: {
          instance: SchemaRefineError,
          properties: {
            cause: "refine error",
          },
        },
      },
      {
        description: "attribute refining fails",
        schema: {
          root: [uuid],
          entities: {
            [uuid]: {
              type: "textField",
              attributes: {
                stringMin10: "refine will fail",
                transformedString: "1234567890",
                overridenEmail: "my@email.com",
              },
            },
          },
        },
        expectedError: {
          instance: EntitiesAttributesValidationError,
          properties: {
            errors: {
              [uuid]: {
                stringMin10: {
                  issues: [
                    {
                      code: "custom",
                      message: "refine failed",
                      path: [],
                    },
                  ],
                  name: "ZodError",
                },
              },
            },
          },
        },
      },
      {
        description: "attribute parsing fails",
        schema: {
          root: [uuid],
          entities: {
            [uuid]: {
              type: "textField",
              attributes: {
                stringMin10: "",
                transformedString: "1234567890",
                overridenEmail: "invalid email",
              },
            },
          },
        },
        expectedError: {
          instance: EntitiesAttributesValidationError,
          properties: {
            errors: {
              [uuid]: {
                overridenEmail: {
                  issues: [
                    {
                      validation: "email",
                      code: "invalid_string",
                      message: "Invalid email",
                      path: [],
                    },
                  ],
                  name: "ZodError",
                },
                stringMin10: {
                  issues: [
                    {
                      code: "too_small",
                      minimum: 10,
                      type: "string",
                      inclusive: true,
                      exact: false,
                      message: "String must contain at least 10 character(s)",
                      path: [],
                    },
                  ],
                  name: "ZodError",
                },
              },
            },
          },
        },
      },
    ] as const)(
      "should fail when $description",
      async ({ schema, expectedError }) => {
        const result = await validateSchema(schema, builder);

        assertErrorResult(result);

        expect(result.error).toBeInstanceOf(expectedError.instance);

        if (expectedError.properties) {
          expect(result).toMatchObject({
            error: expectedError.properties,
            success: false,
          });
        }
      },
    );
  });
});
