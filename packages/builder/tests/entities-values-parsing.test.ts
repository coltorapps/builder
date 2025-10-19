import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createBuilder } from "../src/builder";
import {
  EntitiesValuesStructuralError,
  EntityUnprocessableError,
  EntityValueNotAllowedError,
  parseDraftEntitiesValues,
  parseEntitiesValues,
} from "../src/entities-values-parsing";
import { createEntityDefinition } from "../src/entity-definition";
import {
  ReferencedEntityNotFoundError,
  SchemaParseError,
  SchemaStructuralError,
} from "../src/schema-parsing";
import { createEntityRef } from "../src/utils";

const builder = createBuilder({
  entities: {
    unprocessableSection: createEntityDefinition({
      shouldBeProcessed: () => false,
      childrenAllowed: true,
    }),
    textField: createEntityDefinition({
      parse: (value) => z.string().toUpperCase().safeParse(value),
    }),
    selectField: createEntityDefinition({
      parse: (value) => z.string().toUpperCase().optional().safeParse(value),
    }),
    valueProhibited: createEntityDefinition(),
  },
  validateEntityId: (id) => typeof id === "string",
});

describe("parseEntitiesValues", () => {
  describe("success cases", () => {
    it("should succeed when valid entities values provided", () => {
      const schema = {
        entities: {
          textField: {
            type: "textField",
            attributes: {},
          },
          selectField: {
            type: "selectField",
            attributes: {},
          },
        },
        root: ["textField", "selectField"],
      } as const;

      const result = parseEntitiesValues(
        { textField: "value" },
        schema,
        builder,
      );

      expect(result).toStrictEqual({
        success: true,
        value: {
          textField: "VALUE",
          selectField: undefined,
        },
      });
    });
  });

  describe("failure cases", () => {
    it.each([
      {
        description: "unprocessable entities values provided",
        schema: {
          entities: {
            unprocessableSection: {
              type: "unprocessableSection",
              attributes: {},
              children: ["textField"],
            },
            textField: {
              type: "textField",
              attributes: {},
              parentId: "unprocessableSection",
            },
          },
          root: ["unprocessableSection"],
        } as const,
        values: { textField: "123" },
        expectedError: {
          instance: EntityUnprocessableError,
          payload: {
            entityRef: createEntityRef("textField", "textField"),
            sourceEntityRef: createEntityRef(
              "unprocessableSection",
              "unprocessableSection",
            ),
          },
        },
      },
      {
        description: "prohibited entities values provided",
        schema: {
          entities: {
            valueProhibited: {
              type: "valueProhibited",
              attributes: {},
            },
          },
          root: ["valueProhibited"],
        } as const,
        values: { valueProhibited: 123 },
        expectedError: {
          instance: EntityValueNotAllowedError,
          payload: {
            entityRef: createEntityRef("valueProhibited", "valueProhibited"),
          },
        },
      },
      {
        description: "invalid schema provided",
        schema: {
          entities: {},
          root: ["invalid"],
        },
        values: {},
        expectedError: {
          instance: SchemaParseError,
          causeInstance: SchemaStructuralError,
          payload: {
            cause: {
              issues: [
                {
                  _tag: "Type",
                  path: ["root", 0],
                  message: "Invalid ID reference",
                },
              ],
            },
          },
        },
      },
      {
        description: "invalid entities values shape provided",
        schema: {
          entities: {},
          root: [],
        },
        values: "invalid",
        expectedError: {
          instance: EntitiesValuesStructuralError,
          payload: {
            issues: [
              {
                _tag: "Type",
                path: [],
                message: 'Expected EntitiesValues, actual "invalid"',
              },
            ],
          },
        },
      },
      {
        description: "invalid entity reference provided",
        schema: {
          entities: {},
          root: [],
        },
        values: {
          invalid: 123,
        },
        expectedError: {
          instance: ReferencedEntityNotFoundError,
          payload: {
            entityId: "invalid",
          },
        },
      },
    ])("should fail when $description", ({ values, schema, expectedError }) => {
      const result = parseEntitiesValues(values, schema, builder);

      expect(result.error).toBeInstanceOf(expectedError.instance);

      if (expectedError.causeInstance) {
        expect(result.error?.cause).toBeInstanceOf(expectedError.causeInstance);
      }

      expect(result.error).toMatchObject(expectedError.payload);
    });
  });
});

describe("parseDraftEntitiesValues", () => {
  describe("success cases", () => {
    it("should succeed when valid and partial entities values provided", () => {
      const schema = {
        entities: {
          textField1: {
            type: "textField",
            attributes: {},
          },
          textField2: {
            type: "textField",
            attributes: {},
          },
        },
        root: ["textField1", "textField2"],
      } as const;

      const result = parseDraftEntitiesValues(
        { textField1: "value" },
        schema,
        builder,
      );

      expect(result).toStrictEqual({
        success: true,
        value: {
          textField1: "VALUE",
        },
      });
    });
  });
});
