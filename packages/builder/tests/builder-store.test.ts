import { Effect } from "effect";
import { ParseError } from "effect/ParseResult";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createAttribute } from "../src/attribute";
import { createBuilder } from "../src/builder";
import {
  collectEntityDescendants,
  createBuilderStore,
  EntitiesAttributesErrorsParseError,
  EntityIdAlreadyExistsError,
  IndexOutOfBoundsError,
  parseEntitiesAttributesErrors,
} from "../src/builder-store";
import { createEntity } from "../src/entity";
import {
  ChildNotAllowedError,
  EntityAttributeParseError,
  EntityAttributesParseError,
  EntityNotFoundError,
  InvalidAttributeNameError,
  InvalidEntityIdError,
  InvalidEntityTypeError,
  ParentNotAllowedError,
  ParentRequiredError,
  SchemaParseError,
} from "../src/schema-parsing";
import {
  EntitiesAttributesValidationError,
  EntityAttributesValidationError,
  EntityAttributeValidationError,
  type EntitiesAttributesErrors,
} from "../src/schema-validation";
import { runSyncAsResult } from "../src/utils";
import {
  assertErrResult,
  assertOkResult,
  dataResultAsValueResult,
} from "./utils";

describe("collectEntityDescendants", () => {
  describe("success cases", () => {
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

    it.each([
      {
        entityId: "a",
        expectedDescendants: [],
        description: "empty array for leaf entity with no children",
      },
      {
        entityId: "b",
        expectedDescendants: ["a"],
        description: "direct children for entity with one child",
      },
      {
        entityId: "c",
        expectedDescendants: ["b", "a"],
        description: "all recursive descendants in hierarchical chain",
      },
    ] as const)(
      "should succeed with $description",
      ({ entityId, expectedDescendants }) => {
        expect(
          runSyncAsResult(collectEntityDescendants(entityId, schema)),
        ).toStrictEqual({ success: true, value: expectedDescendants });
      },
    );
  });

  describe("failure cases", () => {
    it("should fail when invalid entity id provided", () => {
      const result = runSyncAsResult(
        collectEntityDescendants("non-existent", {
          entities: {},
          root: [],
        }),
      );

      expect(result).toStrictEqual({
        success: false,
        error: new EntityNotFoundError({ entityId: "non-existent" }),
      });
    });
  });
});

describe("parseAttributeErrors", () => {
  const builder = createBuilder({
    entities: {
      textField: createEntity({
        attributes: {
          label: createAttribute(
            {
              parse: (value) => ({ success: true, value }),
            },
            {
              refine: () => ({ success: false, error: "Error" }),
            },
          ),
        },
      }),
    },
  });

  const schema = {
    entities: {
      entity1: { type: "textField" },
    },
    root: ["entity1"],
  } as const;

  describe("success cases", () => {
    it("should succeed when valid errors provided", () => {
      const errors = {
        entity1: { label: "error" },
      };

      const result = Effect.runSync(
        parseEntitiesAttributesErrors(errors, schema, builder),
      );

      expect(result).toStrictEqual(errors);
    });
  });

  describe("failure cases", () => {
    it.each([
      {
        description: "invalid entity ID provided",
        errors: {
          invalidId: { label: "error" },
        },
        expectedError: {
          instance: EntitiesAttributesErrorsParseError,
          causeInstance: EntityNotFoundError,
          cause: { entityId: "invalidId" },
        },
      },
      {
        description: "invalid attribute name provided",
        errors: {
          entity1: { invalidAttr: "error" },
        },
        expectedError: {
          instance: EntitiesAttributesErrorsParseError,
          causeInstance: InvalidAttributeNameError,
          cause: {
            entityType: "textField",
            attributeName: "invalidAttr",
            validAttributeNames: ["label"],
          },
        },
      },
    ])("should fail when $description", ({ errors, expectedError }) => {
      const result = runSyncAsResult(
        parseEntitiesAttributesErrors(errors, schema, builder),
      );

      assertErrResult(result);

      expect(result.error).toBeInstanceOf(expectedError.instance);

      expect(result.error.cause).toBeInstanceOf(expectedError.causeInstance);

      expect(result.error.cause).toMatchObject(expectedError.cause);
    });
  });
});

describe("builder store", () => {
  describe("initialization", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntity({
          attributes: {
            label: createAttribute(
              {
                parse: (value) => ({ success: true, value: value }),
              },
              {
                refine: () => ({ success: false, error: "Error" }),
              },
            ),
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
    };

    describe("success cases", () => {
      it.each([
        {
          description: "valid initial data provided",
          options: {
            initialData: {
              schema: validSchema,
              entitiesAttributesErrors: validAttributeErrors,
            },
          },
          expectedData: {
            schema: validSchema,
            entitiesAttributesErrors: validAttributeErrors,
          },
        },
        {
          description: "no initial data provided",
          options: {},
          expectedData: {
            schema: {
              entities: {},
              root: [],
            },
            entitiesAttributesErrors: {},
          },
        },
      ] as const)(
        "should succeed when $description",
        ({ options, expectedData }) => {
          const result = createBuilderStore(builder, options);

          assertOkResult(result);

          expect(result.value.getData()).toEqual(expectedData);
        },
      );
    });

    describe("failure cases", () => {
      it.each([
        {
          description: "invalid attribute errors provided",
          initialData: {
            schema: validSchema,
            entitiesAttributesErrors: {
              entity1: { invalidAttr: "error" },
            },
          },
          expectedError: {
            instance: EntitiesAttributesErrorsParseError,
            causeInstance: InvalidAttributeNameError,
            cause: {
              entityType: "textField",
              attributeName: "invalidAttr",
              validAttributeNames: ["label"],
            },
          },
        },
        {
          description: "invalid schema provided",
          initialData: {
            schema: {
              entities: {
                1337: { type: "textField" },
              },
              root: [],
            },
            entitiesAttributesErrors: validAttributeErrors,
          },
          expectedError: {
            instance: SchemaParseError,
          },
        },
      ] as const)(
        "should fail when $description",
        ({ initialData, expectedError }) => {
          const result = createBuilderStore(builder, {
            initialData,
          });

          assertErrResult(result);

          expect(result.error).toBeInstanceOf(expectedError.instance);

          if (expectedError.causeInstance) {
            expect(result.error.cause).toBeInstanceOf(
              expectedError.causeInstance,
            );
          }

          if (expectedError.cause) {
            expect(result.error).toMatchObject({
              cause: expectedError.cause,
            });
          }
        },
      );
    });
  });

  describe("removeEntity", () => {
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
              entity1: { type: "textField", children: ["entity2"] },
              entity2: {
                type: "textField",
                parentId: "entity1",
                children: ["entity3"],
              },
              entity3: { type: "textField", parentId: "entity2" },
            },
            root: ["entity1"],
          },
        },
      });

      assertOkResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
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
              children: [],
              type: "textField",
            },
          },
          root: ["entity1"],
        });
      });
    });

    describe("failure cases", () => {
      it("should fail with invalid id", () => {
        const builderStore = makeBuilderStore();

        const removalResult = builderStore.removeEntity("invalidId");

        assertErrResult(removalResult);

        expect(removalResult.error).toBeInstanceOf(EntityNotFoundError);

        expect(removalResult.error.entityId).toEqual("invalidId");
      });
    });
  });

  describe("addEntity", () => {
    describe("success cases", () => {
      function makeBuilderStore() {
        const builder = createBuilder({
          entities: {
            textField: createEntity({
              attributes: {
                label: createAttribute({
                  parse: (value) =>
                    dataResultAsValueResult(
                      z
                        .string()
                        .transform((s) => s + "-transformed")
                        .safeParse(value),
                    ),
                }),
                withDefault: createAttribute({
                  parse: (value) =>
                    dataResultAsValueResult(
                      z
                        .string()
                        .transform((s) => s + "-transformed")
                        .safeParse(value),
                    ),
                  defaultValue: () => "default",
                }),
              },
            }),
            container: createEntity({
              childrenAllowed: true,
              attributes: {
                title: createAttribute({
                  parse: (value) => ({ success: true, value }),
                }),
              },
            }),
          },
          validateEntityId: (id) => typeof id === "string" && id.length > 0,
        });

        const result = createBuilderStore(builder, {
          initialData: {
            schema: {
              entities: {
                container1: {
                  type: "container",
                  children: [],
                },
              },
              root: ["container1"],
            },
          },
        });

        assertOkResult(result);

        return result.value;
      }

      it("should succeed when parent ID is not provided", () => {
        const store = makeBuilderStore();

        const results = [
          store.addEntity({
            id: "entity1",
            type: "textField",
            attributes: { label: "My Field" },
          }),
          store.addEntity({
            id: "entity2",
            type: "textField",
            attributes: {},
          }),
          store.addEntity({
            id: "entity3",
            type: "textField",
            index: 0,
          }),
        ];

        expect(results).toStrictEqual([
          {
            success: true,
            value: {
              entity: {
                attributes: {
                  label: "My Field-transformed",
                  withDefault: "default-transformed",
                },
                type: "textField",
                id: "entity1",
              },
              index: 1,
            },
          },
          {
            success: true,
            value: {
              entity: {
                type: "textField",
                id: "entity2",
                attributes: {
                  withDefault: "default-transformed",
                },
              },
              index: 2,
            },
          },
          {
            success: true,
            value: {
              entity: {
                type: "textField",
                id: "entity3",
                attributes: {
                  withDefault: "default-transformed",
                },
              },
              index: 0,
            },
          },
        ]);

        expect(store.getData().schema).toStrictEqual({
          entities: {
            container1: {
              children: [],
              type: "container",
            },
            entity1: {
              attributes: {
                label: "My Field-transformed",
                withDefault: "default-transformed",
              },
              type: "textField",
            },
            entity2: {
              type: "textField",
              attributes: {
                withDefault: "default-transformed",
              },
            },
            entity3: {
              type: "textField",
              attributes: {
                withDefault: "default-transformed",
              },
            },
          },
          root: ["entity3", "container1", "entity1", "entity2"],
        });
      });

      it("should succeed when parent ID is provided", () => {
        const store = makeBuilderStore();

        const results = [
          store.addEntity({
            id: "entity1",
            type: "textField",
            parentId: "container1",
          }),
          store.addEntity({
            id: "entity2",
            type: "textField",
            parentId: "container1",
            index: 0,
          }),
        ];

        expect(results).toStrictEqual([
          {
            success: true,
            value: {
              entity: {
                id: "entity1",
                type: "textField",
                parentId: "container1",
                attributes: {
                  withDefault: "default-transformed",
                },
              },
              index: 0,
            },
          },
          {
            success: true,
            value: {
              entity: {
                id: "entity2",
                type: "textField",
                parentId: "container1",
                attributes: {
                  withDefault: "default-transformed",
                },
              },
              index: 0,
            },
          },
        ]);

        expect(store.getData().schema).toStrictEqual({
          entities: {
            container1: {
              children: ["entity2", "entity1"],
              type: "container",
            },
            entity1: {
              type: "textField",
              parentId: "container1",
              attributes: {
                withDefault: "default-transformed",
              },
            },
            entity2: {
              type: "textField",
              parentId: "container1",
              attributes: {
                withDefault: "default-transformed",
              },
            },
          },
          root: ["container1"],
        });
      });
    });

    describe("failure cases", () => {
      function makeBuilderStore() {
        const builder = createBuilder({
          entities: {
            textField: createEntity({
              parentRequired: true,
              attributes: {
                label: createAttribute({
                  parse: (value) => {
                    if (typeof value === "string" && value.length > 0) {
                      return { success: true, value };
                    }
                    return {
                      success: false,
                      error: "Label must be a non-empty string",
                    };
                  },
                }),
              },
            }),
            container: createEntity({
              childrenAllowed: true,
              parentAllowed: true,
            }),
            restrictedContainer: createEntity({
              childrenAllowed: true,
            }),
            specialField: createEntity({
              parentRequired: true,
              attributes: {
                description: createAttribute({
                  parse: (value) => ({ success: true, value }),
                }),
              },
            }),
          },
          entityOverrides: {
            textField: {
              parentAllowed: ["container"],
            },
            container: {
              childrenAllowed: ["textField", "specialField"],
              parentAllowed: ["restrictedContainer"],
            },
            restrictedContainer: {
              childrenAllowed: ["container", "specialField"],
            },
            specialField: {
              parentAllowed: ["restrictedContainer"],
            },
          },
          validateEntityId: (id) =>
            typeof id === "string" && id.startsWith("valid_"),
        });

        const result = createBuilderStore(builder, {
          initialData: {
            schema: {
              entities: {
                valid_container1: {
                  type: "container",
                  parentId: "valid_restricted1",
                },
                valid_restricted1: {
                  type: "restrictedContainer",
                  children: ["valid_container1"],
                },
              },
              root: ["valid_restricted1"],
            },
          },
        });

        assertOkResult(result);

        return result.value;
      }

      const errorTestCases = [
        {
          description: "invalid entity type provided",
          action: () => {
            return makeBuilderStore().addEntity({
              id: "valid_entity1",
              // @ts-expect-error Testing invalid entity type
              type: "nonExistentType",
            });
          },
          expectedError: {
            instance: InvalidEntityTypeError,
            payload: { entityType: "nonExistentType" },
          },
        },
        {
          description: "entity ID already exists in schema",
          action: () => {
            return makeBuilderStore().addEntity({
              id: "valid_container1",
              type: "container",
            });
          },
          expectedError: {
            instance: EntityIdAlreadyExistsError,
            payload: { entityId: "valid_container1" },
          },
        },
        {
          description: "index out of bounds in root",
          action: () => {
            return makeBuilderStore().addEntity({
              id: "valid_id",
              type: "container",
              index: -100,
            });
          },
          expectedError: {
            instance: IndexOutOfBoundsError,
            payload: { index: -100, arrayLength: 1 },
          },
        },
        {
          description: "index out of bounds in parent",
          action: () => {
            const builderStore = makeBuilderStore();

            builderStore.addEntity({
              id: "valid_id",
              type: "textField",
              parentId: "valid_container1",
              index: 0,
            });

            return builderStore.addEntity({
              id: "valid_id2",
              type: "textField",
              parentId: "valid_container1",
              index: 1000,
            });
          },
          expectedError: {
            instance: IndexOutOfBoundsError,
            payload: { index: 1000, arrayLength: 1 },
          },
        },
        {
          description: "entity ID fails validation",
          action: () => {
            return makeBuilderStore().addEntity({
              id: "invalid_id",
              type: "container",
            });
          },
          expectedError: {
            instance: InvalidEntityIdError,
            payload: { entityId: "invalid_id" },
          },
        },
        {
          description: "entity requires parent but none provided",
          action: () => {
            return makeBuilderStore().addEntity({
              id: "valid_id",
              type: "textField",
            });
          },
          expectedError: {
            instance: ParentRequiredError,
            payload: { entityType: "textField" },
          },
        },
        {
          description: "invalid attribute name provided",
          action: () => {
            return makeBuilderStore().addEntity({
              id: "valid_id",
              type: "textField",
              parentId: "valid_container1",
              // @ts-expect-error Testing invalid attribute name
              attributes: { nonExistentAttribute: "value" },
            });
          },
          expectedError: {
            instance: InvalidAttributeNameError,
            payload: {
              entityType: "textField",
              attributeName: "nonExistentAttribute",
              validAttributeNames: ["label"],
            },
          },
        },
        {
          description: "parent entity ID not found in schema",
          action: () => {
            return makeBuilderStore().addEntity({
              id: "valid_id",
              type: "textField",
              parentId: "nonExistentParent",
            });
          },
          expectedError: {
            instance: EntityNotFoundError,
            payload: { entityId: "nonExistentParent" },
          },
        },
        {
          description: "child type not allowed by parent entity",
          action: () => {
            return makeBuilderStore().addEntity({
              id: "valid_id",
              type: "textField",
              parentId: "valid_restricted1",
            });
          },
          expectedError: {
            instance: ChildNotAllowedError,
            payload: {
              entityType: "restrictedContainer",
              allowedChildren: ["container", "specialField"],
            },
          },
        },
        {
          description: "parent type not allowed by child entity",
          action: () => {
            return makeBuilderStore().addEntity({
              id: "valid_specialfield1",
              type: "specialField",
              parentId: "valid_container1",
            });
          },
          expectedError: {
            instance: ParentNotAllowedError,
            payload: {
              entityType: "specialField",
              allowedParents: ["restrictedContainer"],
            },
          },
        },
        {
          description: "attribute parsing fails",
          action: () => {
            return makeBuilderStore().addEntity({
              id: "valid_id",
              type: "textField",
              parentId: "valid_container1",
              attributes: { label: "" },
            });
          },
          expectedError: {
            instance: EntityAttributesParseError,
            payload: {
              errors: { label: "Label must be a non-empty string" },
            },
          },
        },
      ];

      it.each(errorTestCases)(
        "should fail when $description",
        ({ action, expectedError }) => {
          const result = action();

          assertErrResult(result);

          expect(result.error).toBeInstanceOf(expectedError.instance);

          expect(result.error).toMatchObject(expectedError.payload);
        },
      );
    });
  });

  describe("setData", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntity(),
      },
      validateEntityId: (id) => typeof id === "string",
    });

    function makeBuilderStore() {
      const builderStoreResult = createBuilderStore(builder, {
        initialData: {
          schema: {
            entities: {
              entity1: { type: "textField" },
            },
            root: ["entity1"],
          },
        },
      });

      assertOkResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      it("should succeed when valid data provided", () => {
        const builderStore = makeBuilderStore();

        const tests = [
          {
            action: () =>
              builderStore.setData({
                schema: {
                  entities: {
                    entity2: { type: "textField" },
                  },
                  root: ["entity2"],
                },
                entitiesAttributesErrors: {},
              }),
            data: {
              schema: {
                entities: {
                  entity2: { type: "textField" },
                },
                root: ["entity2"],
              },
              entitiesAttributesErrors: {},
            },
          },
          {
            action: () =>
              builderStore.setData({
                schema: {
                  entities: {
                    entity2: { type: "textField" },
                  },
                  root: ["entity2"],
                },
                schemaError: "error" as never,
                entitiesAttributesErrors: {},
              }),
            data: {
              schema: {
                entities: {
                  entity2: {
                    type: "textField",
                  },
                },
                root: ["entity2"],
              },
              entitiesAttributesErrors: {},
              schemaError: "error",
            },
          },
        ];

        for (const test of tests) {
          const result = test.action();

          assertOkResult(result);

          expect(result.value).toStrictEqual(test.data);

          expect(builderStore.getData()).toStrictEqual(test.data);
        }
      });
    });

    describe("failure cases", () => {
      it.each([
        {
          description: "non-existent entity ID provided",
          action: (builderStore: ReturnType<typeof makeBuilderStore>) =>
            builderStore.setData({
              schema: {
                entities: {
                  entity1: { type: "textField" },
                },
                root: ["entity1"],
              },
              entitiesAttributesErrors: {
                invalidId: { invalidAttr: "error" },
              },
            }),
          expectedError: {
            instance: EntitiesAttributesErrorsParseError,
            causeInstance: EntityNotFoundError,
            cause: {
              entityId: "invalidId",
            },
          },
        },
        {
          description: "invalid attribute name provided",
          action: (builderStore: ReturnType<typeof makeBuilderStore>) =>
            builderStore.setData({
              schema: {
                entities: {
                  entity1: { type: "textField" },
                },
                root: ["entity1"],
              },
              entitiesAttributesErrors: {
                entity1: { invalidAttr: "error" },
              },
            }),
          expectedError: {
            instance: EntitiesAttributesErrorsParseError,
            causeInstance: InvalidAttributeNameError,
            cause: {
              entityType: "textField",
              attributeName: "invalidAttr",
              validAttributeNames: [],
            },
          },
        },
        {
          description: "invalid schema provided",
          action: (builderStore: ReturnType<typeof makeBuilderStore>) =>
            builderStore.setData({
              schema: {} as never,
              entitiesAttributesErrors: {},
            }),
          expectedError: {
            instance: SchemaParseError,
            causeInstance: ParseError,
          },
        },
      ])("should fail when $description", ({ action, expectedError }) => {
        const builderStore = makeBuilderStore();
        const result = action(builderStore);

        assertErrResult(result);

        expect(result.error).toBeInstanceOf(expectedError.instance);

        expect(result.error.cause).toBeInstanceOf(expectedError.causeInstance);

        if (expectedError.cause) {
          expect(result.error.cause).toMatchObject(expectedError.cause);
        }
      });
    });
  });

  describe("setEntityIndex", () => {
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
              entity1: { type: "textField" },
              entity2: { type: "textField", children: ["entity3", "entity4"] },
              entity3: { type: "textField", parentId: "entity2" },
              entity4: { type: "textField", parentId: "entity2" },
            },
            root: ["entity1", "entity2"],
          },
        },
      });

      assertOkResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      it("should succeed when valid ID and index provided", () => {
        const builderStore = makeBuilderStore();

        const results = [
          builderStore.setEntityIndex("entity1", 1),
          builderStore.setEntityIndex("entity3", 1),
        ] as const;

        assertOkResult(results[0]);
        assertOkResult(results[1]);

        expect([results[0].value, results[1].value]).toStrictEqual([
          { entityId: "entity1", index: 1 },
          { entityId: "entity3", index: 1 },
        ]);

        expect(builderStore.getData().schema).toStrictEqual({
          entities: {
            entity1: { type: "textField" },
            entity2: { type: "textField", children: ["entity4", "entity3"] },
            entity3: { type: "textField", parentId: "entity2" },
            entity4: { type: "textField", parentId: "entity2" },
          },
          root: ["entity2", "entity1"],
        });
      });
    });

    describe("failure cases", () => {
      it.each([
        {
          description: "invalid entity ID provided",
          entityId: "invalidId",
          index: 1,
          expectedError: {
            instance: EntityNotFoundError,
            properties: {
              entityId: "invalidId",
            },
          },
        },
        {
          description: "invalid index provided",
          entityId: "entity1",
          index: 100,
          expectedError: {
            instance: IndexOutOfBoundsError,
            properties: {
              index: 100,
              arrayLength: 1,
            },
          },
        },
      ] as const)(
        "should fail when $description",
        ({ entityId, index, expectedError }) => {
          const builderStore = makeBuilderStore();

          const result = builderStore.setEntityIndex(entityId, index);

          assertErrResult(result);

          expect(result.error).toBeInstanceOf(expectedError.instance);

          expect(result.error).toMatchObject(expectedError.properties);
        },
      );
    });
  });

  describe("setEntityParent", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntity({
          childrenAllowed: true,
          parentAllowed: true,
        }),
        container: createEntity({
          childrenAllowed: true,
          parentAllowed: true,
        }),
        restrictedField: createEntity({
          parentRequired: true,
        }),
        noChildrenContainer: createEntity({
          childrenAllowed: false,
        }),
        rootOnlyEntity: createEntity({
          parentAllowed: false,
        }),
      },
      entityOverrides: {
        textField: {
          parentAllowed: ["container"],
        },
        restrictedField: {
          parentAllowed: ["container"],
        },
        container: {
          childrenAllowed: ["textField", "restrictedField"],
        },
      },
      validateEntityId: (id) => typeof id === "string",
    });

    function makeBuilderStore() {
      const builderStoreResult = createBuilderStore(builder, {
        initialData: {
          schema: {
            entities: {
              entity1: { type: "textField" },
              entity2: { type: "textField" },
              container1: { type: "container", children: ["entity3"] },
              entity3: { type: "textField", parentId: "container1" },
              container2: { type: "container", children: ["entity4"] },
              entity4: { type: "restrictedField", parentId: "container2" },
              rootOnlyEntity1: { type: "rootOnlyEntity" },
              noChildrenContainer1: { type: "noChildrenContainer" },
            },
            root: [
              "entity1",
              "entity2",
              "container1",
              "container2",
              "rootOnlyEntity1",
              "noChildrenContainer1",
            ],
          },
        },
      });

      assertOkResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      const successTestCases = [
        {
          description: "move entity from root to parent without index",
          action: (store: ReturnType<typeof makeBuilderStore>) =>
            store.setEntityParent("entity1", "container1"),
          expectedResult: {
            entityId: "entity1",
            parentId: "container1",
            index: 1,
          },
          expectedSchema: {
            entities: {
              entity1: { type: "textField", parentId: "container1" },
              entity2: { type: "textField" },
              container1: {
                type: "container",
                children: ["entity3", "entity1"],
              },
              entity3: { type: "textField", parentId: "container1" },
              container2: { type: "container", children: ["entity4"] },
              entity4: { type: "restrictedField", parentId: "container2" },
              rootOnlyEntity1: { type: "rootOnlyEntity" },
              noChildrenContainer1: { type: "noChildrenContainer" },
            },
            root: [
              "entity2",
              "container1",
              "container2",
              "rootOnlyEntity1",
              "noChildrenContainer1",
            ],
          },
        },
        {
          description: "move entity from root to parent with index",
          action: (store: ReturnType<typeof makeBuilderStore>) =>
            store.setEntityParent("entity2", "container1", 0),
          expectedResult: {
            entityId: "entity2",
            parentId: "container1",
            index: 0,
          },
          expectedSchema: {
            entities: {
              entity1: { type: "textField" },
              entity2: { type: "textField", parentId: "container1" },
              container1: {
                type: "container",
                children: ["entity2", "entity3"],
              },
              entity3: { type: "textField", parentId: "container1" },
              container2: { type: "container", children: ["entity4"] },
              entity4: { type: "restrictedField", parentId: "container2" },
              rootOnlyEntity1: { type: "rootOnlyEntity" },
              noChildrenContainer1: { type: "noChildrenContainer" },
            },
            root: [
              "entity1",
              "container1",
              "container2",
              "rootOnlyEntity1",
              "noChildrenContainer1",
            ],
          },
        },
        {
          description: "move entity from parent to root without index",
          action: (store: ReturnType<typeof makeBuilderStore>) =>
            store.setEntityParent("entity3", undefined),
          expectedResult: {
            entityId: "entity3",
            index: 6,
            parentId: undefined,
          },
          expectedSchema: {
            entities: {
              entity1: { type: "textField" },
              entity2: { type: "textField" },
              container1: { type: "container", children: [] },
              entity3: { type: "textField" },
              container2: { type: "container", children: ["entity4"] },
              entity4: { type: "restrictedField", parentId: "container2" },
              rootOnlyEntity1: { type: "rootOnlyEntity" },
              noChildrenContainer1: { type: "noChildrenContainer" },
            },
            root: [
              "entity1",
              "entity2",
              "container1",
              "container2",
              "rootOnlyEntity1",
              "noChildrenContainer1",
              "entity3",
            ],
          },
        },
        {
          description: "move entity from parent to root with index",
          action: (store: ReturnType<typeof makeBuilderStore>) =>
            store.setEntityParent("entity3", undefined, 0),
          expectedResult: {
            entityId: "entity3",
            index: 0,
            parentId: undefined,
          },
          expectedSchema: {
            entities: {
              entity1: { type: "textField" },
              entity2: { type: "textField" },
              container1: { type: "container", children: [] },
              entity3: { type: "textField" },
              container2: { type: "container", children: ["entity4"] },
              entity4: { type: "restrictedField", parentId: "container2" },
              rootOnlyEntity1: { type: "rootOnlyEntity" },
              noChildrenContainer1: { type: "noChildrenContainer" },
            },
            root: [
              "entity3",
              "entity1",
              "entity2",
              "container1",
              "container2",
              "rootOnlyEntity1",
              "noChildrenContainer1",
            ],
          },
        },
        {
          description:
            "move entity from parent to another parent without index",
          action: (store: ReturnType<typeof makeBuilderStore>) =>
            store.setEntityParent("entity4", "container1"),
          expectedResult: {
            entityId: "entity4",
            parentId: "container1",
            index: 1,
          },
          expectedSchema: {
            entities: {
              entity1: { type: "textField" },
              entity2: { type: "textField" },
              container1: {
                type: "container",
                children: ["entity3", "entity4"],
              },
              entity3: { type: "textField", parentId: "container1" },
              container2: { type: "container", children: [] },
              entity4: { type: "restrictedField", parentId: "container1" },
              rootOnlyEntity1: { type: "rootOnlyEntity" },
              noChildrenContainer1: { type: "noChildrenContainer" },
            },
            root: [
              "entity1",
              "entity2",
              "container1",
              "container2",
              "rootOnlyEntity1",
              "noChildrenContainer1",
            ],
          },
        },
        {
          description: "move entity from parent to another parent with index",
          action: (store: ReturnType<typeof makeBuilderStore>) =>
            store.setEntityParent("entity3", "container2", 0),
          expectedResult: {
            entityId: "entity3",
            parentId: "container2",
            index: 0,
          },
          expectedSchema: {
            entities: {
              entity1: { type: "textField" },
              entity2: { type: "textField" },
              container1: { type: "container", children: [] },
              entity3: { type: "textField", parentId: "container2" },
              container2: {
                type: "container",
                children: ["entity3", "entity4"],
              },
              entity4: { type: "restrictedField", parentId: "container2" },
              rootOnlyEntity1: { type: "rootOnlyEntity" },
              noChildrenContainer1: { type: "noChildrenContainer" },
            },
            root: [
              "entity1",
              "entity2",
              "container1",
              "container2",
              "rootOnlyEntity1",
              "noChildrenContainer1",
            ],
          },
        },
      ];

      it.each(successTestCases)(
        "should succeed when $description",
        ({ action, expectedResult, expectedSchema }) => {
          const store = makeBuilderStore();

          const result = action(store);

          assertOkResult(result);

          expect(result.value).toStrictEqual(expectedResult);

          expect(store.getData().schema).toStrictEqual(expectedSchema);
        },
      );
    });

    describe("failure cases", () => {
      const errorTestCases = [
        {
          description: "entity ID not found in schema",
          action: () => {
            return makeBuilderStore().setEntityParent(
              "nonExistentEntity",
              "container1",
            );
          },
          expectedError: {
            instance: EntityNotFoundError,
            payload: { entityId: "nonExistentEntity" },
          },
        },
        {
          description: "new parent ID not found in schema",
          action: () => {
            return makeBuilderStore().setEntityParent(
              "entity1",
              "nonExistentParent",
            );
          },
          expectedError: {
            instance: EntityNotFoundError,
            payload: { entityId: "nonExistentParent" },
          },
        },
        {
          description: "index out of bounds in new parent",
          action: () => {
            return makeBuilderStore().setEntityParent(
              "entity1",
              "container1",
              100,
            );
          },
          expectedError: {
            instance: IndexOutOfBoundsError,
            payload: { index: 100, arrayLength: 1 },
          },
        },
        {
          description: "index out of bounds in root",
          action: () => {
            return makeBuilderStore().setEntityParent(
              "entity3",
              undefined,
              100,
            );
          },
          expectedError: {
            instance: IndexOutOfBoundsError,
            payload: { index: 100, arrayLength: 6 },
          },
        },
        {
          description: "negative index out of bounds",
          action: () => {
            return makeBuilderStore().setEntityParent(
              "entity1",
              "container1",
              -1,
            );
          },
          expectedError: {
            instance: IndexOutOfBoundsError,
            payload: { index: -1, arrayLength: 1 },
          },
        },
        {
          description: "entity requires parent but moving to root",
          action: () => {
            return makeBuilderStore().setEntityParent("entity4", undefined);
          },
          expectedError: {
            instance: ParentRequiredError,
            payload: { entityType: "restrictedField" },
          },
        },
        {
          description: "parent type not allowed by child entity",
          action: () => {
            return makeBuilderStore().setEntityParent(
              "entity1",
              "noChildrenContainer1",
            );
          },
          expectedError: {
            instance: ParentNotAllowedError,
            payload: {
              entityType: "textField",
              allowedParents: ["container"],
            },
          },
        },
        {
          description: "child type not allowed by parent entity",
          action: () => {
            return makeBuilderStore().setEntityParent(
              "noChildrenContainer1",
              "container1",
            );
          },
          expectedError: {
            instance: ChildNotAllowedError,
            payload: {
              entityType: "container",
              allowedChildren: ["textField", "restrictedField"],
            },
          },
        },
        {
          description:
            "child type not allowed by parent entity (override restrictions)",
          action: () => {
            return makeBuilderStore().setEntityParent(
              "rootOnlyEntity1",
              "container1",
            );
          },
          expectedError: {
            instance: ParentNotAllowedError,
            payload: {
              entityType: "rootOnlyEntity",
              allowedParents: [],
            },
          },
        },
      ];

      it.each(errorTestCases)(
        "should fail when $description",
        ({ action, expectedError }) => {
          const result = action();

          assertErrResult(result);

          expect(result.error).toBeInstanceOf(expectedError.instance);

          expect(result.error).toMatchObject(expectedError.payload);
        },
      );
    });
  });

  describe("setEntityAttributeValue", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntity({
          attributes: {
            label: createAttribute({
              parse: (value) => {
                if (typeof value === "string") {
                  return {
                    success: true,
                    value: value + "-transformed",
                  };
                }

                return {
                  success: false,
                  error: "Label must be a string",
                };
              },
            }),
          },
        }),
      },
      validateEntityId: (id) => typeof id === "string",
    });

    function makeBuilderStore() {
      const builderStoreResult = createBuilderStore(builder, {
        initialData: {
          schema: {
            entities: {
              entity1: {
                type: "textField",
                attributes: { label: "Label" },
              },
            },
            root: ["entity1"],
          },
        },
      });

      assertOkResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      it.each([
        {
          description: "valid attribute name and value provided",
          action: (store: ReturnType<typeof makeBuilderStore>) => {
            return store.setEntityAttributeValue(
              "entity1",
              "label",
              "New Label",
            );
          },
          expectedResult: {
            entityId: "entity1",
            attributeName: "label",
            attributeValue: "New Label-transformed",
          },
          expectedSchema: {
            entities: {
              entity1: {
                type: "textField",
                attributes: { label: "New Label-transformed" },
              },
            },
            root: ["entity1"],
          },
        },
      ] as const)(
        "should succeed when $description",
        ({ action, expectedResult, expectedSchema }) => {
          const store = makeBuilderStore();

          const result = action(store);

          assertOkResult(result);

          expect(result.value).toStrictEqual(expectedResult);

          expect(store.getData().schema).toStrictEqual(expectedSchema);
        },
      );
    });

    describe("failure cases", () => {
      it.each([
        {
          description: "invalid entity ID provided",
          entityId: "nonExistentEntity",
          attributeName: "label",
          attributeValue: "Some Value",
          expectedError: {
            instance: EntityNotFoundError,
            properties: {
              entityId: "nonExistentEntity",
            },
          },
        },
        {
          description: "invalid attribute name provided",
          entityId: "entity1",
          attributeName: "nonExistentAttribute",
          attributeValue: "Some Value",
          expectedError: {
            instance: InvalidAttributeNameError,
            properties: {
              entityType: "textField",
              attributeName: "nonExistentAttribute",
              validAttributeNames: ["label"],
            },
          },
        },
        {
          description: "attribute parsing fails with wrong type",
          entityId: "entity1",
          attributeName: "label",
          attributeValue: 123,
          expectedError: {
            instance: EntityAttributeParseError,
            properties: {
              entityId: "entity1",
              entityType: "textField",
              attributeName: "label",
              cause: "Label must be a string",
            },
          },
        },
        {
          description: "attribute parsing fails with undefined",
          entityId: "entity1",
          attributeName: "label",
          attributeValue: undefined,
          expectedError: {
            instance: EntityAttributeParseError,
            properties: {
              entityId: "entity1",
              entityType: "textField",
              attributeName: "label",
              cause: "Label must be a string",
            },
          },
        },
      ] as const)(
        "should fail when $description",
        ({ entityId, attributeName, attributeValue, expectedError }) => {
          const builderStore = makeBuilderStore();

          const result = builderStore.setEntityAttributeValue(
            entityId,
            attributeName,
            attributeValue,
          );

          assertErrResult(result);

          expect(result.error).toBeInstanceOf(expectedError.instance);

          expect(result.error).toMatchObject(expectedError.properties);
        },
      );
    });
  });

  describe("clearEntityAttributeValue", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntity({
          attributes: {
            label: createAttribute({
              parse: (value) => ({ success: true, value }),
            }),
            required: createAttribute({
              parse: (value) => ({ success: true, value }),
            }),
          },
        }),
      },
      validateEntityId: (id) => typeof id === "string",
    });

    function makeBuilderStore() {
      const builderStoreResult = createBuilderStore(builder, {
        initialData: {
          schema: {
            entities: {
              entity1: {
                type: "textField",
                attributes: { label: "Label", required: true },
              },
            },
            root: ["entity1"],
          },
        },
      });

      assertOkResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      it("should succeed when valid entity ID and attribute name provided", () => {
        const store = makeBuilderStore();

        const result = store.clearEntityAttributeValue("entity1", "label");

        assertOkResult(result);

        expect(result.value).toStrictEqual({
          entityId: "entity1",
          attributeName: "label",
        });

        expect(store.getData().schema).toStrictEqual({
          entities: {
            entity1: {
              type: "textField",
              attributes: { required: true },
            },
          },
          root: ["entity1"],
        });
      });
    });

    describe("failure cases", () => {
      it.each([
        {
          description: "invalid entity ID provided",
          entityId: "nonExistentEntity",
          attributeName: "label",
          expectedError: {
            instance: EntityNotFoundError,
            properties: {
              entityId: "nonExistentEntity",
            },
          },
        },
        {
          description: "invalid attribute name provided",
          entityId: "entity1",
          attributeName: "nonExistentAttribute",
          expectedError: {
            instance: InvalidAttributeNameError,
            properties: {
              entityType: "textField",
              attributeName: "nonExistentAttribute",
              validAttributeNames: ["label", "required"],
            },
          },
        },
      ] as const)(
        "should fail when $description",
        ({ entityId, attributeName, expectedError }) => {
          const builderStore = makeBuilderStore();

          const result = builderStore.clearEntityAttributeValue(
            entityId,
            attributeName,
          );

          assertErrResult(result);

          expect(result.error).toBeInstanceOf(expectedError.instance);

          expect(result.error).toMatchObject(expectedError.properties);
        },
      );
    });
  });

  describe("clearEntityAttributesValues", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntity({
          attributes: {
            label: createAttribute({
              parse: (value) => ({ success: true, value }),
            }),
            required: createAttribute({
              parse: (value) => ({ success: true, value }),
            }),
            minLength: createAttribute({
              parse: (value) => ({ success: true, value }),
            }),
          },
        }),
      },
      validateEntityId: (id) => typeof id === "string",
    });

    function makeBuilderStore() {
      const builderStoreResult = createBuilderStore(builder, {
        initialData: {
          schema: {
            entities: {
              entity1: {
                type: "textField",
                attributes: { label: "Label", required: true },
              },
            },
            root: ["entity1"],
          },
        },
      });

      assertOkResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      it("should succeed when valid entity ID provided", () => {
        const store = makeBuilderStore();

        const result = store.clearEntityAttributesValues("entity1");

        assertOkResult(result);

        expect(result.value).toStrictEqual({
          entityId: "entity1",
        });

        expect(store.getData().schema).toStrictEqual({
          entities: {
            entity1: {
              type: "textField",
            },
          },
          root: ["entity1"],
        });
      });
    });

    describe("failure cases", () => {
      it("should fail when invalid entity ID provided", () => {
        const builderStore = makeBuilderStore();

        const result =
          builderStore.clearEntityAttributesValues("nonExistentEntity");

        assertErrResult(result);

        expect(result.error).toBeInstanceOf(EntityNotFoundError);

        expect(result.error).toMatchObject({
          entityId: "nonExistentEntity",
        });
      });
    });
  });

  describe("setEntityAttributeError", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntity({
          attributes: {
            label: createAttribute({
              parse: (value) => ({ success: true, value }),
            }),
          },
        }),
      },
      validateEntityId: (id) => typeof id === "string",
    });

    function makeBuilderStore() {
      const builderStoreResult = createBuilderStore(builder, {
        initialData: {
          schema: {
            entities: {
              entity1: {
                type: "textField",
              },
            },
            root: ["entity1"],
          },
        },
      });

      assertOkResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      it("should succeed when valid entity ID and attribute name provided", () => {
        const store = makeBuilderStore();

        const result = store.setEntityAttributeError(
          "entity1",
          "label",
          "Error",
        );

        assertOkResult(result);

        expect(result.value).toStrictEqual({
          entityId: "entity1",
          attributeName: "label",
          attributeError: "Error",
        });

        expect(store.getData().entitiesAttributesErrors).toStrictEqual({
          entity1: {
            label: "Error",
          },
        });
      });
    });

    describe("failure cases", () => {
      it.each([
        {
          description: "invalid entity ID provided",
          entityId: "nonExistentEntity",
          attributeName: "label",
          error: "Error",
          expectedError: {
            instance: EntityNotFoundError,
            properties: {
              entityId: "nonExistentEntity",
            },
          },
        },
        {
          description: "invalid attribute name provided",
          entityId: "entity1",
          attributeName: "nonExistentAttribute",
          error: "Error",
          expectedError: {
            instance: InvalidAttributeNameError,
            properties: {
              entityType: "textField",
              attributeName: "nonExistentAttribute",
              validAttributeNames: ["label"],
            },
          },
        },
      ] as const)(
        "should fail when $description",
        ({ entityId, attributeName, error, expectedError }) => {
          const builderStore = makeBuilderStore();

          const result = builderStore.setEntityAttributeError(
            entityId,
            attributeName,
            error,
          );

          assertErrResult(result);

          expect(result.error).toBeInstanceOf(expectedError.instance);

          expect(result.error).toMatchObject(expectedError.properties);
        },
      );
    });
  });

  describe("setEntityAttributesErrors", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntity({
          attributes: {
            label: createAttribute({
              parse: (value) => ({ success: true, value }),
            }),
            required: createAttribute({
              parse: (value) => ({ success: true, value }),
            }),
          },
        }),
      },
      validateEntityId: (id) => typeof id === "string",
    });

    function makeBuilderStore() {
      const builderStoreResult = createBuilderStore(builder, {
        initialData: {
          schema: {
            entities: {
              entity1: {
                type: "textField",
              },
            },
            root: ["entity1"],
          },
        },
      });

      assertOkResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      it("should succeed when valid entity ID and attribute names provided", () => {
        const store = makeBuilderStore();

        const result = store.setEntityAttributesErrors("entity1", {
          label: "Error Label",
          required: "Error Required",
        });

        assertOkResult(result);

        expect(result.value).toStrictEqual({
          entityId: "entity1",
          attributesErrors: {
            label: "Error Label",
            required: "Error Required",
          },
        });

        expect(store.getData().entitiesAttributesErrors).toStrictEqual({
          entity1: {
            label: "Error Label",
            required: "Error Required",
          },
        });
      });
    });

    describe("failure cases", () => {
      it.each([
        {
          description: "invalid entity ID provided",
          entityId: "nonExistentEntity",
          attributesErrors: {
            label: "Error",
          },
          expectedError: {
            instance: EntityNotFoundError,
            properties: {
              entityId: "nonExistentEntity",
            },
          },
        },
        {
          description: "invalid attribute names provided",
          entityId: "entity1",
          attributesErrors: {
            nonExistentAttribute: "Error",
          },
          expectedError: {
            instance: InvalidAttributeNameError,
            properties: {
              entityType: "textField",
              attributeName: "nonExistentAttribute",
              validAttributeNames: ["label", "required"],
            },
          },
        },
      ] as const)(
        "should fail when $description",
        ({ entityId, attributesErrors, expectedError }) => {
          const builderStore = makeBuilderStore();

          const result = builderStore.setEntityAttributesErrors(
            entityId,
            attributesErrors,
          );

          assertErrResult(result);

          expect(result.error).toBeInstanceOf(expectedError.instance);

          expect(result.error).toMatchObject(expectedError.properties);
        },
      );
    });
  });

  describe("setEntitiesAttributesErrors", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntity({
          attributes: {
            label: createAttribute({
              parse: (value) => ({ success: true, value }),
            }),
            required: createAttribute({
              parse: (value) => ({ success: true, value }),
            }),
          },
        }),
        container: createEntity({
          attributes: {
            title: createAttribute({
              parse: (value) => ({ success: true, value }),
            }),
          },
        }),
      },
      validateEntityId: (id) => typeof id === "string",
    });

    function makeBuilderStore() {
      const builderStoreResult = createBuilderStore(builder, {
        initialData: {
          schema: {
            entities: {
              entity1: {
                type: "textField",
              },
              entity2: {
                type: "container",
              },
            },
            root: ["entity1", "entity2"],
          },
        },
      });

      assertOkResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      it.each([
        {
          description: "valid entities attribute errors provided",
          attributesErrors: {
            entity1: {
              label: "Label Error",
              required: "Required Error",
            },
            entity2: {
              title: "Title Error",
            },
          },
          expectedData: {
            entity1: {
              label: "Label Error",
              required: "Required Error",
            },
            entity2: {
              title: "Title Error",
            },
          },
        },
        {
          description: "empty entities attribute errors provided",
          attributesErrors: {},
          expectedData: {},
        },
        {
          description: "partial entities attribute errors provided",
          attributesErrors: {
            entity1: {
              label: "Label Error",
            },
          },
          expectedData: {
            entity1: {
              label: "Label Error",
            },
          },
        },
      ] as const)(
        "should succeed when $description",
        ({ attributesErrors, expectedData }) => {
          const store = makeBuilderStore();

          const result = store.setEntitiesAttributesErrors(attributesErrors);

          assertOkResult(result);

          expect(result.value).toStrictEqual({
            attributesErrors,
          });

          expect(store.getData().entitiesAttributesErrors).toStrictEqual(
            expectedData,
          );
        },
      );
    });

    describe("failure cases", () => {
      it.each([
        {
          description: "invalid entity ID provided",
          attributesErrors: {
            nonExistentEntity: {
              label: "Error",
            },
          },
          expectedError: {
            instance: EntitiesAttributesErrorsParseError,
            causeInstance: EntityNotFoundError,
            cause: {
              entityId: "nonExistentEntity",
            },
          },
        },
        {
          description: "invalid attribute name provided",
          attributesErrors: {
            entity1: {
              nonExistentAttribute: "Error",
            },
          },
          expectedError: {
            instance: EntitiesAttributesErrorsParseError,
            causeInstance: InvalidAttributeNameError,
            cause: {
              entityType: "textField",
              attributeName: "nonExistentAttribute",
              validAttributeNames: ["label", "required"],
            },
          },
        },
        {
          description: "mixed valid and invalid entity IDs provided",
          attributesErrors: {
            entity1: {
              label: "Valid Error",
            },
            nonExistentEntity: {
              label: "Invalid Error",
            },
          },
          expectedError: {
            instance: EntitiesAttributesErrorsParseError,
            causeInstance: EntityNotFoundError,
            cause: {
              entityId: "nonExistentEntity",
            },
          },
        },
        {
          description: "mixed valid and invalid attribute names provided",
          attributesErrors: {
            entity1: {
              label: "Valid Error",
              nonExistentAttribute: "Invalid Error",
            },
          },
          expectedError: {
            instance: EntitiesAttributesErrorsParseError,
            causeInstance: InvalidAttributeNameError,
            cause: {
              entityType: "textField",
              attributeName: "nonExistentAttribute",
              validAttributeNames: ["label", "required"],
            },
          },
        },
      ] as const)(
        "should fail when $description",
        ({ attributesErrors, expectedError }) => {
          const builderStore = makeBuilderStore();

          const result =
            builderStore.setEntitiesAttributesErrors(attributesErrors);

          assertErrResult(result);

          expect(result.error).toBeInstanceOf(expectedError.instance);

          expect(result.error.cause).toBeInstanceOf(
            expectedError.causeInstance,
          );

          expect(result.error.cause).toMatchObject(expectedError.cause);
        },
      );
    });
  });

  describe("validateEntityAttribute", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntity({
          attributes: {
            parse: createAttribute({
              parse: (value) => {
                if (typeof value === "string") {
                  return {
                    success: true,
                    value: value + "-parsed",
                  };
                }

                return {
                  success: false,
                  error: "must be a string",
                };
              },
            }),
            parseAndRefine: createAttribute(
              {
                parse: (value) => {
                  if (typeof value === "string") {
                    return {
                      success: true,
                      value: value + "-parsed",
                    };
                  }

                  return {
                    success: false,
                    error: "must be a string",
                  };
                },
              },
              {
                refine: (value) => {
                  if (value === "refine should be failing-parsed") {
                    return {
                      success: false,
                      error: "Refine fail",
                    };
                  }

                  if (typeof value === "string") {
                    return {
                      success: true,
                      value: value + "-refined",
                    };
                  }

                  return {
                    success: false,
                    error: "must be a string",
                  };
                },
              },
            ),
            failedAttribute: createAttribute({
              parse: () => {
                return {
                  success: false,
                  error: "failure",
                };
              },
            }),
          },
        }),
      },
      validateEntityId: (id) => typeof id === "string",
    });

    function makeBuilderStore() {
      const builderStoreResult = createBuilderStore(builder);

      assertOkResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      it.each([
        {
          description: "attribute passes parsing",
          entityId: "entity1",
          attributeName: "parse",
          initialData: {
            schema: {
              entities: {
                entity1: {
                  type: "textField",
                  attributes: { parse: "", parseAndRefine: "1" },
                },
              },
              root: ["entity1"],
            },
            entitiesAttributesErrors: {
              entity1: {
                parse: "must be a string",
                parseAndRefine: "must be a string",
                failedAttribute: "failure",
              },
            } as unknown as EntitiesAttributesErrors,
          },
          expectedResult: {
            entityId: "entity1",
            attributeName: "parse",
            attributeValue: "-parsed",
          },
          expectedData: {
            schema: {
              entities: {
                entity1: {
                  type: "textField",
                  attributes: {
                    parse: "-parsed",
                    parseAndRefine: "1-parsed",
                  },
                },
              },
              root: ["entity1"],
            },
            entitiesAttributesErrors: {
              entity1: {
                failedAttribute: "failure",
                parseAndRefine: "must be a string",
              },
            } as unknown as EntitiesAttributesErrors,
          },
        },
        {
          description: "attribute passes parsing and refinement",
          entityId: "entity1",
          attributeName: "parseAndRefine",
          initialData: {
            schema: {
              entities: {
                entity1: {
                  type: "textField",
                  attributes: {
                    parse: "",
                    parseAndRefine: "long enough string",
                  },
                },
              },
              root: ["entity1"],
            },
            entitiesAttributesErrors: {
              entity1: {
                failedAttribute: "failure",
              },
            } as unknown as EntitiesAttributesErrors,
          },
          expectedResult: {
            entityId: "entity1",
            attributeName: "parseAndRefine",
            attributeValue: "long enough string-parsed-refined",
          },
          expectedData: {
            schema: {
              entities: {
                entity1: {
                  type: "textField",
                  attributes: {
                    parse: "-parsed",
                    parseAndRefine: "long enough string-parsed-refined",
                  },
                },
              },
              root: ["entity1"],
            },
            entitiesAttributesErrors: {
              entity1: {
                failedAttribute: "failure",
              },
            },
          },
        },
      ] as const)(
        "should succeed when $description",
        async ({
          entityId,
          attributeName,
          initialData,
          expectedResult,
          expectedData,
        }) => {
          const store = makeBuilderStore();

          store.setData(initialData);

          const result = await store.validateEntityAttribute(
            entityId,
            attributeName,
          );

          assertOkResult(result);

          expect(result.value).toStrictEqual(expectedResult);

          expect(store.getData()).toStrictEqual(expectedData);
        },
      );
    });

    describe("failure cases", () => {
      it.each([
        {
          description: "invalid entity ID provided",
          entityId: "nonExistentEntity",
          attributeName: "parse",
          expectedError: {
            instance: EntityNotFoundError,
            properties: {
              entityId: "nonExistentEntity",
            },
          },
          initialData: {
            schema: {
              entities: {},
              root: [],
            },
            entitiesAttributesErrors: {},
          },
        },
        {
          description: "invalid attribute name provided",
          entityId: "entity1",
          attributeName: "nonExistentAttribute",
          expectedError: {
            instance: InvalidAttributeNameError,
            properties: {
              entityType: "textField",
              attributeName: "nonExistentAttribute",
              validAttributeNames: [
                "parse",
                "parseAndRefine",
                "failedAttribute",
              ],
            },
          },
          initialData: {
            schema: {
              entities: {
                entity1: {
                  type: "textField",
                },
              },
              root: ["entity1"],
            },
            entitiesAttributesErrors: {},
          },
        },
        {
          description: "invalid attribute parsing value provided",
          entityId: "entity1",
          attributeName: "parse",
          expectedError: {
            instance: EntityAttributeValidationError,
            properties: {
              entityId: "entity1",
              entityType: "textField",
              attributeName: "parse",
              cause: "must be a string",
            },
          },
          initialData: {
            schema: {
              entities: {
                entity1: {
                  type: "textField",
                },
              },
              root: ["entity1"],
            },
            entitiesAttributesErrors: {
              entity1: {
                parse: "must be a string",
              },
            },
          },
          expectedData: {
            schema: {
              entities: {
                entity1: {
                  type: "textField",
                },
              },
              root: ["entity1"],
            },
            entitiesAttributesErrors: {
              entity1: {
                parse: "must be a string",
              },
            },
          },
        },
        {
          description: "invalid attribute refinement value provided",
          entityId: "entity1",
          attributeName: "parseAndRefine",
          expectedError: {
            instance: EntityAttributeValidationError,
            properties: {
              entityId: "entity1",
              entityType: "textField",
              attributeName: "parseAndRefine",
              cause: "Refine fail",
            },
          },
          initialData: {
            schema: {
              entities: {
                entity1: {
                  type: "textField",
                  attributes: {
                    parse: "",
                    parseAndRefine: "refine should be failing",
                  },
                },
              },
              root: ["entity1"],
            },
            entitiesAttributesErrors: {
              entity1: {
                parseAndRefine: "Refine fail",
              },
            },
          },
          expectedData: {
            schema: {
              entities: {
                entity1: {
                  type: "textField",
                  attributes: {
                    parse: "-parsed",
                    parseAndRefine: "refine should be failing-parsed",
                  },
                },
              },
              root: ["entity1"],
            },
            entitiesAttributesErrors: {
              entity1: {
                parseAndRefine: "Refine fail",
              },
            },
          },
        },
      ] as const)(
        "should fail when $description",
        async ({
          entityId,
          attributeName,
          initialData,
          expectedError,
          expectedData,
        }) => {
          const store = makeBuilderStore();

          store.setData(initialData);

          const result = await store.validateEntityAttribute(
            entityId,
            attributeName,
          );

          assertErrResult(result);

          expect(result.error).toBeInstanceOf(expectedError.instance);

          expect(result.error).toMatchObject(expectedError.properties);

          if (expectedData) {
            expect(store.getData()).toStrictEqual(expectedData);
          }
        },
      );
    });
  });

  describe("validateEntityAttributes", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntity({
          attributes: {
            label: createAttribute(
              {
                parse: (value) => {
                  if (typeof value !== "string") {
                    return {
                      success: false,
                      error: "must be a string",
                    };
                  }

                  return {
                    success: true,
                    value: value + "-parsed",
                  };
                },
              },
              {
                refine: (value) => {
                  return {
                    success: true,
                    value: value + "-refined",
                  };
                },
              },
            ),
            shouldFail: createAttribute(
              {
                parse: (value) => {
                  if (typeof value !== "string") {
                    return {
                      success: false,
                      error: "must be a string",
                    };
                  }

                  return {
                    success: true,
                    value: value + "-parsed",
                  };
                },
              },
              {
                refine: (value) => {
                  if (value === "fail-parsed") {
                    return {
                      success: false,
                      error: "must not be 'fail-parsed'",
                    };
                  }

                  return {
                    success: true,
                    value: value + "-refined",
                  };
                },
              },
            ),
          },
        }),
      },
      validateEntityId: (id) => typeof id === "string",
    });

    function makeBuilderStore() {
      const builderStoreResult = createBuilderStore(builder, {
        initialData: {
          schema: {
            entities: {
              entity1: {
                type: "textField",
                attributes: {
                  label: "New Label",
                  shouldFail: "Ok for now",
                },
              },
            },
            root: ["entity1"],
          },
          entitiesAttributesErrors: {
            entity1: {
              label: "must be a string",
              shouldFail: "must not be 'fail'",
            },
          },
        },
      });

      assertOkResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      it("should succeed when all attributes are valid", async () => {
        const store = makeBuilderStore();

        const result = await store.validateEntityAttributes("entity1");

        assertOkResult(result);

        expect(result.value).toStrictEqual({
          entityId: "entity1",
          attributes: {
            label: "New Label-parsed-refined",
            shouldFail: "Ok for now-parsed-refined",
          },
        });

        expect(store.getData()).toStrictEqual({
          schema: {
            entities: {
              entity1: {
                type: "textField",
                attributes: {
                  label: "New Label-parsed-refined",
                  shouldFail: "Ok for now-parsed-refined",
                },
              },
            },
            root: ["entity1"],
          },
          entitiesAttributesErrors: {},
        });
      });
    });

    describe("failure cases", () => {
      it("should fail when some attributes are invalid", async () => {
        const store = makeBuilderStore();

        assertOkResult(
          store.setEntityAttributeValue("entity1", "shouldFail", "fail"),
        );

        const result = await store.validateEntityAttributes("entity1");

        assertErrResult(result);

        expect(result.error).toBeInstanceOf(EntityAttributesValidationError);

        expect(result.error).toMatchObject({
          errors: {
            shouldFail: "must not be 'fail-parsed'",
          },
        });

        expect(store.getData()).toStrictEqual({
          schema: {
            entities: {
              entity1: {
                type: "textField",
                attributes: {
                  label: "New Label-parsed-refined",
                  shouldFail: "fail-parsed",
                },
              },
            },
            root: ["entity1"],
          },
          entitiesAttributesErrors: {
            entity1: {
              shouldFail: "must not be 'fail-parsed'",
            },
          },
        });
      });
    });
  });

  describe("validateEntitiesAttributes", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntity({
          attributes: {
            label: createAttribute(
              {
                parse: (value) => {
                  if (typeof value !== "string") {
                    return {
                      success: false,
                      error: "must be a string",
                    };
                  }

                  return {
                    success: true,
                    value: value + "-parsed",
                  };
                },
              },
              {
                refine: (value) => {
                  if (value === "fail-parsed") {
                    return {
                      success: false,
                      error: "must not be 'fail-parsed'",
                    };
                  }

                  return {
                    success: true,
                    value: value + "-refined",
                  };
                },
              },
            ),
          },
        }),
      },
      validateEntityId: (id) => typeof id === "string",
    });

    function makeBuilderStore() {
      const builderStoreResult = createBuilderStore(builder, {
        initialData: {
          schema: {
            entities: {
              entity1: {
                type: "textField",
                attributes: {
                  label: "New Label",
                },
              },
              entity2: {
                type: "textField",
                attributes: {
                  label: "New Label",
                },
              },
            },
            root: ["entity1", "entity2"],
          },
          entitiesAttributesErrors: {
            entity1: {
              label: "must be a string",
            },
          },
        },
      });

      assertOkResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      it("should succeed when all attributes are valid", async () => {
        const store = makeBuilderStore();

        const result = await store.validateEntitiesAttributes();

        assertOkResult(result);

        expect(result.value).toStrictEqual({
          schema: {
            entities: {
              entity1: {
                attributes: {
                  label: "New Label-parsed-refined",
                },
                type: "textField",
              },
              entity2: {
                attributes: {
                  label: "New Label-parsed-refined",
                },
                type: "textField",
              },
            },
            root: ["entity1", "entity2"],
          },
        });

        expect(store.getData()).toStrictEqual({
          schema: {
            entities: {
              entity1: {
                attributes: {
                  label: "New Label-parsed-refined",
                },
                type: "textField",
              },
              entity2: {
                attributes: {
                  label: "New Label-parsed-refined",
                },
                type: "textField",
              },
            },
            root: ["entity1", "entity2"],
          },
          entitiesAttributesErrors: {},
        });
      });
    });

    describe("error cases", () => {
      it("should fail when some attributes are invalid", async () => {
        const store = makeBuilderStore();

        store.setEntityAttributeValue("entity1", "label", "fail");

        store.setEntityAttributeValue("entity2", "label", "fail");

        const result = await store.validateEntitiesAttributes();

        assertErrResult(result);

        expect(result.error).toBeInstanceOf(EntitiesAttributesValidationError);

        expect(result.error).toMatchObject({
          errors: {
            entity2: {
              label: "must not be 'fail-parsed'",
            },
          },
        });

        expect(store.getData()).toStrictEqual({
          entitiesAttributesErrors: {
            entity1: {
              label: "must not be 'fail-parsed'",
            },
            entity2: {
              label: "must not be 'fail-parsed'",
            },
          },
          schema: {
            entities: {
              entity1: {
                type: "textField",
              },
              entity2: {
                type: "textField",
              },
            },
            root: ["entity1", "entity2"],
          },
        });
      });
    });
  });

  describe("setSchemaError", () => {
    describe("success cases", () => {
      it("should set the schema error", () => {
        const storeResult = createBuilderStore(
          createBuilder({
            entities: {},
            refineSchema: () => ({
              success: false,
              error: "invalid schema" as const,
            }),
          }),
        );

        assertOkResult(storeResult);

        const result = storeResult.value.setSchemaError("invalid schema");

        assertOkResult(result);

        expect(result.value).toStrictEqual({
          schemaError: "invalid schema",
        });

        expect(storeResult.value.getData().schemaError).toStrictEqual(
          "invalid schema",
        );
      });
    });
  });

  describe("clearSchemaError", () => {
    describe("success cases", () => {
      it("should clear the schema error", () => {
        const storeResult = createBuilderStore(
          createBuilder({
            entities: {},
            refineSchema: () => ({
              success: false,
              error: "invalid schema" as const,
            }),
          }),
          {
            initialData: {
              schemaError: "invalid schema",
            },
          },
        );

        assertOkResult(storeResult);

        const result = storeResult.value.clearSchemaError();

        assertOkResult(result);

        expect(result.value).toBeUndefined();

        expect(storeResult.value.getData()).toStrictEqual({
          entitiesAttributesErrors: {},
          schema: {
            entities: {},
            root: [],
          },
        });
      });
    });
  });
});
