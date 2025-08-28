import { randomUUID } from "crypto";
import { ParseError } from "effect/ParseResult";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createAttributeDefinition } from "../src/attribute-definition";
import { createBuilderDefinition } from "../src/builder-definition";
import { createEntityDefinition } from "../src/entity-definition";
import {
  parseDraftSchema,
  parseSchema,
  SchemaParseError,
} from "../src/schema-parsing";
import { assertErrorResult, dataResultAsValueResult } from "./utils";

const builder = createBuilderDefinition({
  entities: {
    textField: createEntityDefinition({
      attributes: {
        string: createAttributeDefinition({
          parse: (value) => {
            return dataResultAsValueResult(z.string().safeParse(value));
          },
        }),
        transformedString: createAttributeDefinition({
          parse: (value) => {
            return dataResultAsValueResult(
              z
                .string()
                .transform((value) => value.toUpperCase())
                .safeParse(value),
            );
          },
        }),
        withDefaultValue: createAttributeDefinition({
          parse: (value) => {
            return dataResultAsValueResult(
              z
                .string()
                .transform((value) => value.toUpperCase())
                .safeParse(value),
            );
          },
          defaultValue: () => "default",
        }),
      },
    }),
    withChildrenAllowed: createEntityDefinition({
      childrenAllowed: true,
    }),
    withOverridenChildrenAllowed: createEntityDefinition(),
    withParentRequired: createEntityDefinition({
      parentRequired: true,
    }),
    withOverridenParentRequired: createEntityDefinition(),
    withParentNotAllowed: createEntityDefinition({
      parentAllowed: false,
    }),
    withOverridenParentNotAllowed: createEntityDefinition(),
    withSpecificParentAllowed: createEntityDefinition(),
    withSpecificChildrenAllowed: createEntityDefinition(),
  },
  entityOverrides: {
    withOverridenChildrenAllowed: {
      childrenAllowed: true,
    },
    withOverridenParentRequired: {
      parentRequired: true,
    },
    withOverridenParentNotAllowed: {
      parentAllowed: false,
    },
    withSpecificParentAllowed: {
      parentAllowed: ["withOverridenChildrenAllowed"],
    },
    withSpecificChildrenAllowed: {
      childrenAllowed: ["textField"],
    },
  },
});

const uuids = [randomUUID(), randomUUID(), randomUUID(), randomUUID()] as const;

describe("parseDraftSchema", () => {
  describe("success cases", () => {
    it("should succeed when valid data provided", () => {
      expect(
        parseDraftSchema(
          {
            root: [uuids[0], uuids[1], uuids[2], uuids[3]],
            entities: {
              [uuids[0]]: {
                type: "textField",
                attributes: {
                  string: "value",
                },
              },
              [uuids[1]]: {
                type: "textField",
                attributes: {
                  transformedString: "uppercase",
                },
              },
              [uuids[2]]: {
                type: "textField",
                attributes: {},
              },
              [uuids[3]]: {
                type: "textField",
                attributes: {},
              },
            },
          },
          builder,
        ),
      ).toStrictEqual({
        value: {
          entities: {
            [uuids[0]]: {
              attributes: {
                string: "value",
                withDefaultValue: "DEFAULT",
              },
              type: "textField",
            },
            [uuids[1]]: {
              attributes: {
                transformedString: "UPPERCASE",
                withDefaultValue: "DEFAULT",
              },
              type: "textField",
            },
            [uuids[2]]: {
              attributes: {
                withDefaultValue: "DEFAULT",
              },
              type: "textField",
            },
            [uuids[3]]: {
              attributes: {
                withDefaultValue: "DEFAULT",
              },
              type: "textField",
            },
          },
          root: [uuids[0], uuids[1], uuids[2], uuids[3]],
        },
        success: true,
      });
    });
  });

  describe("failure cases", () => {
    it.each([
      {
        name: "missing entities and root",
        data: {},
        issues: [
          {
            _tag: "Missing" as const,
            path: ["entities"],
            message: "is missing",
          },
          { _tag: "Missing" as const, path: ["root"], message: "is missing" },
        ],
      },
      {
        name: "schema is undefined",
        data: undefined,
        issues: [
          {
            _tag: "Type" as const,
            message: "Expected Schema, actual undefined",
            path: [],
          },
        ],
      },
      {
        name: "wrong root and entities types",
        data: {
          root: {},
          entities: [],
        },
        issues: [
          {
            _tag: "Type" as const,
            message: "Expected Entities, actual []",
            path: ["entities"],
          },
          {
            _tag: "Type" as const,
            message: "Expected Root, actual {}",
            path: ["root"],
          },
        ],
      },
      {
        name: "wrong attributes type",
        data: {
          root: [uuids[0]],
          entities: {
            [uuids[0]]: {
              type: "textField",
              attributes: [],
            },
          },
        },
        issues: [
          {
            _tag: "Type",
            message: "Expected Attributes, actual []",
            path: ["entities", uuids[0], "attributes"],
          },
        ],
      },
      {
        name: "attributes not provided",
        data: {
          root: [uuids[0]],
          entities: {
            [uuids[0]]: {
              type: "textField",
            },
          },
        },
        issues: [
          {
            _tag: "Missing",
            message: "is missing",
            path: ["entities", uuids[0], "attributes"],
          },
        ],
      },
      {
        name: "root contains invalid id",
        data: {
          root: ["id", 123],
          entities: {},
        },
        issues: [
          {
            _tag: "Type" as const,
            message: "Expected string, actual 123",
            path: ["root", 1],
          },
        ],
      },
      {
        name: "root references invalid id reference",
        data: {
          root: ["id"],
          entities: {},
        },
        issues: [
          {
            _tag: "Type" as const,
            message: "Invalid ID reference",
            path: ["root", 0],
          },
        ],
      },
      {
        name: "root contains duplicate ids",
        data: {
          root: ["id", "id"],
          entities: {},
        },
        issues: [
          {
            _tag: "Refinement" as const,
            message: "Duplicate IDs",
            path: ["root"],
          },
        ],
      },
      {
        name: "entities map has invalid id key",
        data: {
          root: ["id"],
          entities: { id: { type: "textField", attributes: {} } },
        },
        issues: [
          {
            _tag: "Type" as const,
            message: "Invalid entity ID",
            path: ["entities", "id"],
          },
        ],
      },
      {
        name: "entity type is not one of allowed types",
        data: {
          root: ["id"],
          entities: { id: { type: "invalid type", attributes: {} } },
        },
        issues: [
          {
            _tag: "Refinement" as const,
            message:
              "Expected textField | withChildrenAllowed | withOverridenChildrenAllowed | withParentRequired | withOverridenParentRequired | withParentNotAllowed | withOverridenParentNotAllowed | withSpecificParentAllowed | withSpecificChildrenAllowed, actual: invalid type",
            path: ["entities", "id", "type"],
          },
        ],
      },
      {
        name: "entity type is missing",
        data: {
          root: ["id"],
          entities: { id: { attributes: {} } },
        },
        issues: [
          {
            _tag: "Missing" as const,
            message: "is missing",
            path: ["entities", "id", "type"],
          },
        ],
      },
      {
        name: "entities exist but root is empty",
        data: {
          root: [],
          entities: {
            [uuids[1]]: {
              type: "textField",
              attributes: {},
            },
          },
        },
        issues: [
          {
            _tag: "Type" as const,
            message:
              "At least one root ID must be specified if any entities exist",
            path: ["root"],
          },
        ],
      },
      {
        name: "entity without parent does not appear in root",
        data: {
          root: [uuids[1]],
          entities: {
            [uuids[1]]: {
              type: "textField",
              attributes: {},
            },
            [uuids[0]]: {
              type: "textField",
              attributes: {},
            },
          },
        },
        issues: [
          {
            _tag: "Type" as const,
            message: "Entity without parent must appear in root",
            path: ["entities", uuids[0], "parentId"],
          },
        ],
      },
      {
        name: "entity parentId points to itself",
        data: {
          root: [uuids[1]],
          entities: {
            [uuids[1]]: {
              type: "withChildrenAllowed",
              parentId: uuids[1],
              attributes: {},
            },
          },
        },
        issues: [
          {
            _tag: "Type" as const,
            message: "Entity cannot be its own parent",
            path: ["entities", uuids[1], "parentId"],
          },
        ],
      },
      {
        name: "entity parentId has invalid reference",
        data: {
          root: [uuids[1]],
          entities: {
            [uuids[1]]: {
              type: "textField",
              parentId: "invalid",
              attributes: {},
            },
          },
        },
        issues: [
          {
            _tag: "Type" as const,
            message: "Invalid ID reference",
            path: ["entities", uuids[1], "parentId"],
          },
        ],
      },
      {
        name: "parentId set but not mirrored in parent's children",
        data: {
          root: [uuids[1]],
          entities: {
            [uuids[1]]: {
              type: "withChildrenAllowed",
              attributes: {},
            },
            [uuids[0]]: {
              type: "withChildrenAllowed",
              parentId: uuids[1],
              attributes: {},
            },
          },
        },
        issues: [
          {
            _tag: "Type" as const,
            message: "Relationship not mirrored in remote children",
            path: ["entities", uuids[0], "parentId"],
          },
        ],
      },
      {
        name: "children set but not mirrored in remote parentId",
        data: {
          root: [uuids[1]],
          entities: {
            [uuids[1]]: {
              type: "textField",
              children: [uuids[0]],
              attributes: {},
            },
            [uuids[0]]: {
              type: "textField",
              attributes: {},
            },
          },
        },
        issues: [
          {
            _tag: "Type" as const,
            message: "Relationship not mirrored in remote parentId",
            path: ["entities", uuids[1], "children", 0],
          },
        ],
      },
      {
        name: "children set but children are not allowed for entity",
        data: {
          root: [uuids[1]],
          entities: {
            [uuids[1]]: {
              type: "textField",
              children: [uuids[0]],
              attributes: {},
            },
            [uuids[0]]: {
              type: "textField",
              parentId: uuids[1],
              attributes: {},
            },
          },
        },
        issues: [
          {
            _tag: "Type" as const,
            message: "Entity children are not allowed",
            path: ["entities", uuids[0], "children"],
          },
        ],
      },
      {
        name: "entity requires a parent but none provided",
        data: {
          root: [uuids[1]],
          entities: {
            [uuids[1]]: {
              type: "withParentRequired",
              attributes: {},
            },
          },
        },
        issues: [
          {
            _tag: "Type" as const,
            message: "Entity requires a parent but has none",
            path: ["entities", uuids[1], "parentId"],
          },
        ],
      },
      {
        name: "entity override requires a parent but none provided",
        data: {
          root: [uuids[1]],
          entities: {
            [uuids[1]]: {
              type: "withOverridenParentRequired",
              attributes: {},
            },
          },
        },
        issues: [
          {
            _tag: "Type" as const,
            message: "Entity requires a parent but has none",
            path: ["entities", uuids[1], "parentId"],
          },
        ],
      },
      {
        name: "parent is not allowed for this entity type",
        data: {
          root: [uuids[0]],
          entities: {
            [uuids[1]]: {
              type: "withParentNotAllowed",
              parentId: uuids[0],
              attributes: {},
            },
            [uuids[0]]: {
              type: "withChildrenAllowed",
              children: [uuids[1]],
              attributes: {},
            },
          },
        },
        issues: [
          {
            _tag: "Type" as const,
            message: "Entity parent is not allowed",
            path: ["entities", uuids[1], "parentId"],
          },
        ],
      },
      {
        name: "parent is not allowed via override",
        data: {
          root: [uuids[0]],
          entities: {
            [uuids[1]]: {
              type: "withOverridenParentNotAllowed",
              parentId: uuids[0],
              attributes: {},
            },
            [uuids[0]]: {
              type: "withChildrenAllowed",
              children: [uuids[1]],
              attributes: {},
            },
          },
        },
        issues: [
          {
            _tag: "Type" as const,
            message: "Entity parent is not allowed",
            path: ["entities", uuids[1], "parentId"],
          },
        ],
      },
      {
        name: "parent must be a specific type",
        data: {
          root: [uuids[0]],
          entities: {
            [uuids[1]]: {
              type: "withSpecificParentAllowed",
              parentId: uuids[0],
              attributes: {},
            },
            [uuids[0]]: {
              type: "withChildrenAllowed",
              children: [uuids[1]],
              attributes: {},
            },
          },
        },
        issues: [
          {
            _tag: "Type" as const,
            message:
              "Entity parent must be of type withOverridenChildrenAllowed",
            path: ["entities", uuids[1], "parentId"],
          },
        ],
      },
      {
        name: "children must be a specific type",
        data: {
          root: [uuids[0]],
          entities: {
            [uuids[1]]: {
              type: "withParentRequired",
              parentId: uuids[0],
              attributes: {},
            },
            [uuids[0]]: {
              type: "withSpecificChildrenAllowed",
              children: [uuids[1]],
              attributes: {},
            },
          },
        },
        issues: [
          {
            _tag: "Type" as const,
            message: "Entity children must be of type textField",
            path: ["entities", uuids[1], "children"],
          },
        ],
      },
      {
        name: "attributes parsing fail with Zod error",
        data: {
          root: [uuids[0]],
          entities: {
            [uuids[0]]: {
              type: "textField",
              attributes: {
                string: 123,
                transformedString: [],
              },
            },
          },
        },
        issues: [
          {
            _tag: "Type" as const,
            message:
              '{"issues":[{"code":"invalid_type","expected":"string","received":"number","path":[],"message":"Expected string, received number"}],"name":"ZodError"}',
            path: ["entities", uuids[0], "attributes", "string"],
          },
          {
            _tag: "Type" as const,
            message:
              '{"issues":[{"code":"invalid_type","expected":"string","received":"array","path":[],"message":"Expected string, received array"}],"name":"ZodError"}',
            path: ["entities", uuids[0], "attributes", "transformedString"],
          },
        ],
      },
    ])("should fail when $name", (item) => {
      const result = parseDraftSchema(item.data, builder);

      assertErrorResult(result);

      expect(result.error.issues).toStrictEqual(item.issues);

      expect(result.error.cause).toBeInstanceOf(ParseError);

      expect(result.error).toBeInstanceOf(SchemaParseError);
    });
  });
});
