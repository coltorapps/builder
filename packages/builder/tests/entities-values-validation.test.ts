import { randomUUID } from "crypto";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createBuilder } from "../src/builder";
import {
  EntitiesValuesParseError,
  EntitiesValuesStructuralError,
  EntityUnprocessableError,
  EntityValueNotAllowedError,
} from "../src/entities-values-parsing";
import {
  EntitiesValuesValidationError,
  validateEntitiesValues,
} from "../src/entities-values-validation";
import { createEntityDefinition } from "../src/entity-definition";
import { assertErrorResult } from "./utils";

describe("entities values validation", () => {
  const builder = createBuilder({
    entities: {
      textField: createEntityDefinition(
        {
          parse: (value) => {
            return z.string().toUpperCase().safeParse(value);
          },
        },
        {
          refine: (value) => {
            return z
              .string()
              .min(10)
              .refine((value) => value !== "REFINE WILL FAIL", "refine failed")
              .safeParse(value);
          },
        },
      ),
      selectField: createEntityDefinition(
        {
          parse: (value) => {
            return z.string().safeParse(value);
          },
        },
        {
          refine: (value) => {
            return z
              .string()
              .min(1)
              .transform((v) => v.toUpperCase())
              .safeParse(value);
          },
        },
      ),
      transformedField: createEntityDefinition(
        {
          parse: (value) => {
            return z
              .string()
              .transform((v) => v.toUpperCase())
              .safeParse(value);
          },
        },
        {
          refine: (value) => {
            return z
              .string()
              .transform((v) => v.toLowerCase())
              .safeParse(value);
          },
        },
      ),
      valueProhibited: createEntityDefinition(),
      unprocessableField: createEntityDefinition({
        shouldBeProcessed: () => false,
        parse: (value) => ({ success: true, value }),
      }),
    },
    entityOverrides: {
      textField: {
        async refine(value, ctx) {
          const result = await ctx.refine(value);

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
  });

  const uuids = [randomUUID(), randomUUID(), randomUUID()] as const;

  describe("success cases", () => {
    it.each([
      {
        description: "values parsing and refining pass",
        schema: {
          root: [uuids[1], uuids[2]],
          entities: {
            [uuids[1]]: {
              type: "textField",
              attributes: {},
            },
            [uuids[2]]: {
              type: "selectField",
              attributes: {},
            },
          },
        },
        values: {
          [uuids[1]]: "value-1337",
          [uuids[2]]: "option",
        },
        expectedResult: {
          [uuids[1]]: "VALUE-1337-entityOverride",
          [uuids[2]]: "OPTION",
        },
      },
      {
        description: "values with transformations pass",
        schema: {
          root: [uuids[0]],
          entities: {
            [uuids[0]]: {
              type: "transformedField",
              attributes: {},
            },
          },
        },
        values: {
          [uuids[0]]: "Value",
        },
        expectedResult: {
          [uuids[0]]: "value",
        },
      },
    ] as const)(
      "should succeed when $description",
      async ({ schema, values, expectedResult }) => {
        const result = await validateEntitiesValues(values, schema, builder);
        expect(result).toStrictEqual({
          success: true,
          value: expectedResult,
        });
      },
    );
  });

  describe("failure cases", () => {
    it.each([
      {
        description: "invalid values shape provided",
        schema: {
          root: [],
          entities: {},
        },
        values: "invalid",
        expectedError: {
          instance: EntitiesValuesStructuralError,
        },
      },
      {
        description: "value parsing fails",
        schema: {
          root: [uuids[1]],
          entities: {
            [uuids[1]]: {
              type: "textField",
              attributes: {},
            },
          },
        },
        values: {
          [uuids[1]]: 123,
        },
        expectedError: {
          instance: EntitiesValuesParseError,
          payload: {
            errors: {
              [uuids[1]]: {
                issues: [
                  {
                    code: "invalid_type",
                    expected: "string",
                    received: "number",
                    path: [],
                    message: "Expected string, received number",
                  },
                ],
                name: "ZodError",
              },
            },
          },
        },
      },
      {
        description: "value refining fails",
        schema: {
          root: [uuids[1]],
          entities: {
            [uuids[1]]: {
              type: "textField",
              attributes: {},
            },
          },
        },
        values: {
          [uuids[1]]: "short",
        },
        expectedError: {
          instance: EntitiesValuesValidationError,
          payload: {
            errors: {
              [uuids[1]]: {
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
      {
        description: "value refining fails with custom error",
        schema: {
          root: [uuids[1]],
          entities: {
            [uuids[1]]: {
              type: "textField",
              attributes: {},
            },
          },
        },
        values: {
          [uuids[1]]: "refine will fail",
        },
        expectedError: {
          instance: EntitiesValuesValidationError,
          payload: {
            errors: {
              [uuids[1]]: {
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
      {
        description: "multiple values validation fails",
        schema: {
          root: [uuids[1], uuids[2]],
          entities: {
            [uuids[1]]: {
              type: "textField",
              attributes: {},
            },
            [uuids[2]]: {
              type: "textField",
              attributes: {},
            },
          },
        },
        values: {
          [uuids[1]]: "short",
          [uuids[2]]: "",
        },
        expectedError: {
          instance: EntitiesValuesValidationError,
          payload: {
            errors: {
              [uuids[1]]: {
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
              [uuids[2]]: {
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
      {
        description: "value not allowed",
        schema: {
          root: [uuids[0]],
          entities: {
            [uuids[0]]: {
              type: "valueProhibited",
              attributes: {},
            },
          },
        },
        values: {
          [uuids[0]]: "value",
        },
        expectedError: {
          instance: EntityValueNotAllowedError,
          payload: {
            entityRef: {
              type: "valueProhibited",
              id: uuids[0],
            },
          },
        },
      },
      {
        description: "entity is unprocessable",
        schema: {
          root: [uuids[0]],
          entities: {
            [uuids[0]]: {
              type: "unprocessableField",
              attributes: {},
            },
          },
        },
        values: {
          [uuids[0]]: "value",
        },
        expectedError: {
          instance: EntityUnprocessableError,
          payload: {
            entityRef: {
              type: "unprocessableField",
              id: uuids[0],
            },
          },
        },
      },
    ] as const)(
      "should fail when $description",
      async ({ schema, values, expectedError }) => {
        const result = await validateEntitiesValues(values, schema, builder);

        assertErrorResult(result);

        expect(result.error).toBeInstanceOf(expectedError.instance);

        if ("causeInstance" in expectedError && expectedError.causeInstance) {
          expect(result.error.cause).toBeInstanceOf(
            expectedError.causeInstance,
          );
        }

        if ("payload" in expectedError && expectedError.payload) {
          expect(result.error).toMatchObject(expectedError.payload);
        }
      },
    );
  });
});
