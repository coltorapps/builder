import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { SchemaParseError, type AttributeErrorsByEntityId } from "../src";
import { createAttribute } from "../src/attribute";
import { createBuilder } from "../src/builder";
import {
  AttributeErrorsParsingError,
  collectEntityDescendants,
  createBuilderStore,
  EntityNotFoundError,
  parseAttributeErrors,
} from "../src/builder-store";
import { createEntity } from "../src/entity";
import { asResult } from "../src/utils";
import { assertErrResult, assertOkResult } from "./utils";

describe("collectEntityDescendants", () => {
  it("should recursively collect descendants of an entity", () => {
    const schema = {
      entities: {
        a: {
          type: "",
        },
        b: {
          type: "",
          children: ["a"],
        },
        c: {
          type: "",
          children: ["b"],
        },
      },
      root: [],
    };

    for (const item of [
      ["a", []],
      ["non-existent", []],
      ["b", ["a"]],
      ["c", ["b", "a"]],
    ] as const) {
      expect(collectEntityDescendants(item[0], schema)).toEqual(item[1]);
    }
  });
});

describe("parseAttributeErrors", () => {
  const builder = createBuilder({
    entities: {
      textField: createEntity({
        attributes: {
          label: createAttribute({
            validate: [
              (value) => ({ success: true, value }),
              () => ({ success: false, error: "Error" }),
            ],
          }),
        },
      }),
    },
  });

  const schema = {
    entities: {
      entity1: { type: "textField" as const },
    },
    root: ["entity1"],
  };

  it("should succeed with valid errors", () => {
    const errors = {
      entity1: { label: "error" },
    } as unknown as AttributeErrorsByEntityId<typeof builder>;

    const result = Effect.runSync(
      parseAttributeErrors(errors, schema, builder),
    );

    expect(result).toStrictEqual(errors);
  });

  it("should fail with invalid entity id", () => {
    const errors = {
      invalidId: { label: "error" },
    } as unknown as AttributeErrorsByEntityId<typeof builder>;

    const result = Effect.runSync(
      asResult(parseAttributeErrors(errors, schema, builder)),
    );

    assertErrResult(result);

    expect(result.error).toBeInstanceOf(AttributeErrorsParsingError);

    expect(result.error.message).toEqual(
      "Entity ID not found in schema: invalidId",
    );
  });

  it("should fail with invalid attribute", () => {
    const errors = {
      entity1: { invalidAttr: "error" },
    } as unknown as AttributeErrorsByEntityId<typeof builder>;

    const result = Effect.runSync(
      asResult(parseAttributeErrors(errors, schema, builder)),
    );

    assertErrResult(result);

    expect(result.error).toBeInstanceOf(AttributeErrorsParsingError);

    expect(result.error.message).toEqual(
      "Attribute 'invalidAttr' not found on entity type 'textField' for entity ID 'entity1'",
    );
  });
});

describe("createBuilderStore initialization", () => {
  const builder = createBuilder({
    entities: {
      textField: createEntity({
        attributes: {
          label: createAttribute({
            validate: [
              (value) => ({ success: true, value }),
              () => ({ success: false, error: "Error" }),
            ],
          }),
        },
      }),
    },
    validateEntityId: (id) => typeof id === "string",
  });

  const validSchema = {
    entities: {
      entity1: { type: "textField" as const },
    },
    root: ["entity1"],
  };

  const validAttributeErrors = {
    entity1: { label: "error" },
  } as unknown as AttributeErrorsByEntityId<typeof builder>;

  it("should succeed with valid inputs", () => {
    const result = createBuilderStore(builder, {
      initialData: {
        schema: validSchema,
        attributeErrors: validAttributeErrors,
      },
    });

    assertOkResult(result);

    expect(result.value.getData()).toEqual({
      schema: validSchema,
      attributeErrors: validAttributeErrors,
    });
  });

  it("should propagate AttributeErrorsParsingError", () => {
    const result = createBuilderStore(builder, {
      initialData: {
        schema: validSchema,
        attributeErrors: {
          entity1: { invalidAttr: "error" },
        } as unknown as AttributeErrorsByEntityId<typeof builder>,
      },
    });

    assertErrResult(result);

    expect(result.error).toBeInstanceOf(AttributeErrorsParsingError);
  });

  it("should propagate SchemaParseError", () => {
    const result = createBuilderStore(builder, {
      initialData: {
        schema: {
          entities: {
            1337: { type: "textField" as const },
          },
          root: [],
        },
        attributeErrors: validAttributeErrors,
      },
    });

    assertErrResult(result);

    expect(result.error).toBeInstanceOf(SchemaParseError);
  });
});

describe("createBuilderStore removeEntity", () => {
  const builder = createBuilder({
    entities: {
      textField: createEntity({
        childrenAllowed: true,
      }),
    },
    validateEntityId: (id) => typeof id === "string",
  });

  function makeBuilderStore() {
    const builderStoreResult = createBuilderStore(builder, {
      initialData: {
        schema: {
          entities: {
            entity1: { type: "textField" as const, children: ["entity2"] },
            entity2: {
              type: "textField" as const,
              parentId: "entity1",
              children: ["entity3"],
            },
            entity3: { type: "textField" as const, parentId: "entity2" },
          },
          root: ["entity1"],
        },
      },
    });

    assertOkResult(builderStoreResult);

    return builderStoreResult.value;
  }

  it("should succeed with valid id", () => {
    const builderStore1 = makeBuilderStore();

    expect(builderStore1.removeEntity("entity1")).toStrictEqual({
      success: true,
      value: {
        entityId: "entity1",
      },
    });

    expect(builderStore1.getData().schema).toStrictEqual({
      entities: {},
      root: [],
    });

    const builderStore2 = makeBuilderStore();

    expect(builderStore2.removeEntity("entity2")).toStrictEqual({
      success: true,
      value: {
        entityId: "entity2",
      },
    });

    expect(builderStore2.getData().schema).toStrictEqual({
      entities: {
        entity1: {
          attributes: undefined,
          children: [],
          type: "textField",
        },
      },
      root: ["entity1"],
    });
  });

  it("should fail with invalid id", () => {
    const builderStore = makeBuilderStore();

    const removalResult = builderStore.removeEntity("invalidId");

    assertErrResult(removalResult);

    expect(removalResult.error).toBeInstanceOf(EntityNotFoundError);

    expect(removalResult.error.entityId).toEqual("invalidId");
  });
});
