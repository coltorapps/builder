import { randomUUID } from "crypto";
import { ParseError } from "effect/ParseResult";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createAttribute } from "../src/attribute";
import { createBuilder } from "../src/builder";
import { createEntity } from "../src/entity";
import { parseSchema, SchemaParseError } from "../src/schema-parsing";
import { assertErrResult, dataToValueResult } from "./utils";

const builder = createBuilder({
  entities: {
    textField: createEntity({
      attributes: {
        string: createAttribute({
          validate: (value) => {
            return dataToValueResult(z.string().safeParse(value));
          },
        }),
        transformedString: createAttribute({
          validate: (value) => {
            return dataToValueResult(
              z
                .string()
                .transform((value) => value.toUpperCase())
                .safeParse(value),
            );
          },
        }),
      },
    }),
    withChildrenAllowed: createEntity({
      childrenAllowed: true,
    }),
    withOverridenChildrenAllowed: createEntity(),
    withParentRequired: createEntity({
      parentRequired: true,
    }),
    withOverridenParentRequired: createEntity(),
    withParentNotAllowed: createEntity({
      parentAllowed: false,
    }),
    withOverridenParentNotAllowed: createEntity(),
    withSpecificParentAllowed: createEntity(),
    withSpecificChildrenAllowed: createEntity(),
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

const uuids = [randomUUID(), randomUUID()] as const;

describe("invalid inputs parsing", () => {
  const invalidInputs = [
    {
      name: "missing entities and root",
      data: {},
      issues: [
        { _tag: "Missing" as const, path: ["entities"], message: "is missing" },
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
        {
          _tag: "Type",
          message: "Expected undefined, actual []",
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
        entities: { id: { type: "textField" } },
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
        entities: { id: { type: "invalid type" } },
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
        entities: { id: {} },
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
          },
          [uuids[0]]: {
            type: "textField",
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
            parentId: 'invalid',
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
          },
          [uuids[0]]: {
            type: "withChildrenAllowed",
            parentId: uuids[1],
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
          },
          [uuids[0]]: {
            type: "textField",
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
          },
          [uuids[0]]: {
            type: "textField",
            parentId: uuids[1],
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
          },
          [uuids[0]]: {
            type: "withChildrenAllowed",
            children: [uuids[1]],
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
          },
          [uuids[0]]: {
            type: "withChildrenAllowed",
            children: [uuids[1]],
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
          },
          [uuids[0]]: {
            type: "withChildrenAllowed",
            children: [uuids[1]],
          },
        },
      },
      issues: [
        {
          _tag: "Type" as const,
          message: "Entity parent must be of type withOverridenChildrenAllowed",
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
          },
          [uuids[0]]: {
            type: "withSpecificChildrenAllowed",
            children: [uuids[1]],
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
      name: "attribute parsing fails with Zod error",
      data: {
        root: [uuids[0]],
        entities: {
          [uuids[0]]: {
            type: "textField",
            attributes: {
              string: 123,
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
      ],
    },
  ];

  it.each(invalidInputs)("$name", (item) => {
    const result = parseSchema(item.data, builder);

    assertErrResult(result);

    expect(result.error.issues).toStrictEqual(item.issues);

    expect(result.error.cause).toBeInstanceOf(ParseError);

    expect(result.error).toBeInstanceOf(SchemaParseError);
  });
});

describe("valid inputs parsing", () => {
  it("parses and transforms", () => {
    expect(
      parseSchema(
        {
          root: [uuids[0], uuids[1]],
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
            },
            type: "textField",
          },
          [uuids[1]]: {
            attributes: {
              transformedString: "UPPERCASE",
            },
            type: "textField",
          },
        },
        root: [uuids[0], uuids[1]],
      },
      success: true,
    });
  });
});
