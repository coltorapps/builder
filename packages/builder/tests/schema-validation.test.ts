import { randomUUID } from "crypto";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createAttribute } from "../src/attribute";
import { createBuilder } from "../src/builder";
import { createEntity } from "../src/entity";
import { SchemaParseError } from "../src/schema-parsing";
import {
  AttributesRefineError,
  SchemaRefineError,
  validateSchema,
} from "../src/schema-validation";
import { assertErrResult, dataToValueResult } from "./utils";

const builder = createBuilder({
  entities: {
    textField: createEntity({
      attributes: {
        stringMin10: createAttribute({
          validate: [
            (value) => {
              return dataToValueResult(z.string().safeParse(value));
            },
            (value) => {
              return dataToValueResult(z.string().min(10).safeParse(value));
            },
          ],
        }),
        transformedString: createAttribute({
          validate: [
            (value) => {
              return dataToValueResult(
                z
                  .string()
                  .transform((value) => value + "-parseTransform")
                  .safeParse(value),
              );
            },
            (value) => {
              return dataToValueResult(
                z
                  .string()
                  .transform((value) => value + "-refineTransform")
                  .safeParse(value),
              );
            },
          ],
        }),
        overridenEmail: createAttribute({
          validate: [
            (value) => {
              return dataToValueResult(z.string().safeParse(value));
            },
            (value) => {
              return dataToValueResult(
                z
                  .string()
                  .transform((value) => "refineTransform-" + value)
                  .safeParse(value),
              );
            },
          ],
        }),
      },
      attributeOverrides: {
        overridenEmail: {
          async refine(value, ctx) {
            const result = await ctx.refine(value);

            if (!result.success) {
              return result;
            }

            return dataToValueResult(
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
});

const uuid = randomUUID();

describe("schema validation", () => {
  it("parses the schema and fails on invalid input", async () => {
    const result = await validateSchema({}, builder);

    assertErrResult(result);

    expect(result.error).toBeInstanceOf(SchemaParseError);
  });

  it("parses and refines attributes", async () => {
    const successResult = await validateSchema(
      {
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
      builder,
    );

    expect(successResult).toStrictEqual({
      success: true,
      value: {
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
    });

    const failureResult = await validateSchema(
      {
        root: [uuid],
        entities: {
          [uuid]: {
            type: "textField",
            attributes: {
              stringMin10: "stringMin10",
              transformedString: "1234567890",
              overridenEmail: "invalid email",
            },
          },
        },
      },
      builder,
    );

    assertErrResult(failureResult);

    expect(failureResult).toMatchObject({
      success: false,
      error: {
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
          },
        },
      },
    });

    expect(failureResult.error).toBeInstanceOf(AttributesRefineError);
  });

  it("refines the schema", async () => {
    const builderWithSchemaRefine = createBuilder({
      ...builder,
      refineSchema(schema) {
        if (
          schema.entities[uuid]?.attributes.stringMin10 === "refin will fail"
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

    const successResult = await validateSchema(
      {
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
      builderWithSchemaRefine,
    );

    expect(successResult).toStrictEqual({
      value: {
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
      success: true,
    });

    const failureResult = await validateSchema(
      {
        root: [uuid],
        entities: {
          [uuid]: {
            type: "textField",
            attributes: {
              stringMin10: "refin will fail",
              transformedString: "1234567890",
              overridenEmail: "my@email.com",
            },
          },
        },
      },
      builderWithSchemaRefine,
    );

    assertErrResult(failureResult);

    expect(failureResult).toMatchObject({
      error: {
        cause: "refine error",
      },
      success: false,
    });

    expect(failureResult.error).toBeInstanceOf(SchemaRefineError);
  });
});
