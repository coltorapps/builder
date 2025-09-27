import { randomUUID } from "crypto";
import { Effect } from "effect";
import { ParseError } from "effect/ParseResult";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createAttributeDefinition } from "../src/attribute-definition";
import { createBuilder } from "../src/builder";
import {
  collectEntityDescendants,
  createBuilderStore,
  EntitiesAttributesErrorsParseError,
  EntityIdAlreadyExistsError,
  IndexOutOfBoundsError,
  parseEntitiesAttributesErrors,
} from "../src/builder-store";
import { createEntityDefinition } from "../src/entity-definition";
import { createAttributeRef, createEntityRef } from "../src/generic-store";
import {
  ChildNotAllowedError,
  EntityAttributeParseError,
  EntityAttributesParseError,
  InvalidAttributeNameError,
  InvalidEntityIdError,
  InvalidEntityTypeError,
  ParentNotAllowedError,
  ParentRequiredError,
  ReferencedEntityNotFoundError,
  SchemaStructuralError,
} from "../src/schema-parsing";
import {
  EntitiesAttributesErrors,
  EntitiesAttributesValidationError,
  EntityAttributesValidationError,
  EntityAttributeValidationError,
} from "../src/schema-validation";
import { Result, runSyncAsResult } from "../src/utils";
import { assertErrorResult, assertSuccessResult } from "./utils";

describe("collectEntityDescendants", () => {
  describe("success cases", () => {
    const schema = {
      entities: {
        a: {
          type: "",
          attributes: {},
        },
        b: {
          type: "",
          children: ["a"],
          attributes: {},
        },
        c: {
          type: "",
          children: ["b"],
          attributes: {},
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
        error: new ReferencedEntityNotFoundError({ entityId: "non-existent" }),
      });
    });
  });
});

describe("parseAttributeErrors", () => {
  const builder = createBuilder({
    entities: {
      textField: createEntityDefinition({
        attributes: {
          label: createAttributeDefinition(
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
      entity1: { type: "textField", attributes: {} },
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
          causeInstance: ReferencedEntityNotFoundError,
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

      assertErrorResult(result);

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
        textField: createEntityDefinition({
          attributes: {
            label: createAttributeDefinition(
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
        entity1: { type: "textField", attributes: {} },
      },
      root: ["entity1"],
    } as const;

    const validAttributeErrors = {
      entity1: { label: "error" },
    } as unknown as EntitiesAttributesErrors<typeof builder>;

    describe("success cases", () => {
      it.each([
        {
          description: "valid initial data provided",
          options: {
            initialData: {
              schema: validSchema,
              errors: {
                attributes: validAttributeErrors,
              },
            },
          },
          expectedData: {
            schema: validSchema,
            errors: {
              attributes: validAttributeErrors,
            },
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
            errors: {
              attributes: {},
            },
          },
        },
      ] as const)(
        "should succeed when $description",
        ({ options, expectedData }) => {
          const result = createBuilderStore(builder, options);

          assertSuccessResult(result);

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
            errors: {
              attributes: {
                entity1: { invalidAttr: "error" },
              } as unknown as EntitiesAttributesErrors<typeof builder>,
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
                1337: { type: "textField", attributes: {} },
              },
              root: [],
            },
            errors: {
              attributes: validAttributeErrors,
            },
          },
          expectedError: {
            instance: SchemaStructuralError,
          },
        },
      ] as const)(
        "should fail when $description",
        ({ initialData, expectedError }) => {
          const result = createBuilderStore(builder, {
            initialData,
          });

          assertErrorResult(result);

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
        textField: createEntityDefinition({
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
              entity1: {
                type: "textField",
                children: ["entity2"],
                attributes: {},
              },
              entity2: {
                type: "textField",
                parentId: "entity1",
                children: ["entity3"],
                attributes: {},
              },
              entity3: {
                type: "textField",
                parentId: "entity2",
                attributes: {},
              },
            },
            root: ["entity1"],
          },
        },
      });

      assertSuccessResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      it("should succeed when valid ID provided", () => {
        const builderStore1 = makeBuilderStore();

        expect(
          builderStore1.removeEntity(createEntityRef("textField", "entity1")),
        ).toStrictEqual({
          success: true,
          value: {
            removedEntityRefs: [
              createEntityRef("textField", "entity1"),
              createEntityRef("textField", "entity2"),
              createEntityRef("textField", "entity3"),
            ],
          },
        });

        expect(builderStore1.getData().schema).toStrictEqual({
          entities: {},
          root: [],
        });

        const builderStore2 = makeBuilderStore();

        expect(
          builderStore2.removeEntity(createEntityRef("textField", "entity2")),
        ).toStrictEqual({
          success: true,
          value: {
            removedEntityRefs: [
              createEntityRef("textField", "entity2"),
              createEntityRef("textField", "entity3"),
            ],
          },
        });

        expect(builderStore2.getData().schema).toStrictEqual({
          entities: {
            entity1: {
              children: [],
              type: "textField",
              attributes: {},
            },
          },
          root: ["entity1"],
        });
      });
    });

    describe("failure cases", () => {
      it("should fail with invalid id", () => {
        const builderStore = makeBuilderStore();

        const removalResult = builderStore.removeEntity(
          createEntityRef("textField", "invalidId"),
        );

        assertErrorResult(removalResult);

        expect(removalResult.error).toBeInstanceOf(
          ReferencedEntityNotFoundError,
        );

        expect(removalResult.error.entityId).toEqual("invalidId");
      });
    });
  });

  describe("addEntity", () => {
    describe("success cases", () => {
      function makeBuilderStore() {
        const builder = createBuilder({
          entities: {
            textField: createEntityDefinition({
              attributes: {
                label: createAttributeDefinition({
                  parse: (value) =>
                    z
                      .string()
                      .transform((s) => s + "-transformed")
                      .safeParse(value),
                }),
                withDefault: createAttributeDefinition({
                  parse: (value) =>
                    z
                      .string()
                      .transform((s) => s + "-transformed")
                      .safeParse(value),
                  defaultValue: () => "default",
                }),
              },
            }),
            container: createEntityDefinition({
              childrenAllowed: true,
              attributes: {
                title: createAttributeDefinition({
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
                  attributes: {},
                },
              },
              root: ["container1"],
            },
          },
        });

        assertSuccessResult(result);

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
                ref: {
                  id: "entity1",
                  type: "textField",
                },
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
                ref: {
                  id: "entity2",
                  type: "textField",
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
                ref: {
                  id: "entity3",
                  type: "textField",
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
              attributes: {},
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
                ref: {
                  id: "entity1",
                  type: "textField",
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
                ref: {
                  id: "entity2",
                  type: "textField",
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
              attributes: {},
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
      function makeBuilderStore(
        generateEntityId = () => randomUUID() as string,
      ) {
        const builder = createBuilder({
          entities: {
            textField: createEntityDefinition({
              parentRequired: true,
              attributes: {
                label: createAttributeDefinition({
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
            container: createEntityDefinition({
              childrenAllowed: true,
              parentAllowed: true,
            }),
            restrictedContainer: createEntityDefinition({
              childrenAllowed: true,
            }),
            specialField: createEntityDefinition({
              parentRequired: true,
              attributes: {
                description: createAttributeDefinition({
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
          generateEntityId,
        });

        const result = createBuilderStore(builder, {
          initialData: {
            schema: {
              entities: {
                valid_container1: {
                  type: "container",
                  parentId: "valid_restricted1",
                  attributes: {},
                },
                valid_restricted1: {
                  type: "restrictedContainer",
                  children: ["valid_container1"],
                  attributes: {},
                },
              },
              root: ["valid_restricted1"],
            },
          },
        });

        assertSuccessResult(result);

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
            instance: ReferencedEntityNotFoundError,
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
        {
          description: "invalid entity ID generated",
          action: () => {
            return makeBuilderStore(() => "invalid").addEntity({
              type: "textField",
            });
          },
          expectedError: {
            instance: InvalidEntityIdError,
            payload: {
              entityId: "invalid",
            },
          },
        },
      ];

      it.each(errorTestCases)(
        "should fail when $description",
        ({ action, expectedError }) => {
          const result = action();

          assertErrorResult(result);

          expect(result.error).toBeInstanceOf(expectedError.instance);

          expect(result.error).toMatchObject(expectedError.payload);
        },
      );
    });
  });

  describe("getEntity", () => {
    const builderStoreResult = createBuilderStore(
      createBuilder({
        entities: {
          textField: createEntityDefinition({
            attributes: {
              label: createAttributeDefinition({
                parse: (value) => ({ success: true, value: value }),
              }),
            },
          }),
        },
        validateEntityId: (id) => typeof id === "string",
      }),
      {
        initialData: {
          schema: {
            entities: {
              entity1: { type: "textField", attributes: {} },
              entity2: { type: "textField", attributes: { label: "Label" } },
            },
            root: ["entity1", "entity2"],
          },
        },
      },
    );

    assertSuccessResult(builderStoreResult);

    describe("success cases", () => {
      it("should succeed when valid entity ID provided", () => {
        expect(
          builderStoreResult.value.getEntity(
            createEntityRef("textField", "entity1"),
          ),
        ).toStrictEqual({
          success: true,
          value: {
            id: "entity1",
            type: "textField",
            attributes: {
              label: {
                value: undefined,
                ref: {
                  name: "label",
                  entityRef: {
                    id: "entity1",
                    type: "textField",
                  },
                },
              },
            },
            ref: {
              id: "entity1",
              type: "textField",
            },
          },
        });

        expect(
          builderStoreResult.value.getEntity(
            createEntityRef("textField", "entity2"),
          ),
        ).toStrictEqual({
          success: true,
          value: {
            id: "entity2",
            type: "textField",
            attributes: {
              label: {
                value: "Label",
                ref: {
                  name: "label",
                  entityRef: {
                    id: "entity2",
                    type: "textField",
                  },
                },
              },
            },
            ref: {
              id: "entity2",
              type: "textField",
            },
          },
        });
      });
    });

    describe("failure cases", () => {
      it("should fail when invalid entity ID provided", () => {
        const result = builderStoreResult.value.getEntity(
          createEntityRef("textField", "invalidId"),
        );

        assertErrorResult(result);

        expect(result.error).toBeInstanceOf(ReferencedEntityNotFoundError);

        expect(result.error).toMatchObject({
          entityId: "invalidId",
        });
      });
    });
  });

  describe("getEntityIndex", () => {
    const builderStoreResult = createBuilderStore(
      createBuilder({
        entities: {
          textField: createEntityDefinition({
            childrenAllowed: true,
          }),
        },
        validateEntityId: (id) => typeof id === "string",
      }),
      {
        initialData: {
          schema: {
            entities: {
              entity1: { type: "textField", attributes: {} },
              entity2: {
                type: "textField",
                children: ["entity3", "entity4"],
                attributes: {},
              },
              entity3: {
                type: "textField",
                parentId: "entity2",
                attributes: {},
              },
              entity4: {
                type: "textField",
                parentId: "entity2",
                attributes: {},
              },
            },
            root: ["entity1", "entity2"],
          },
        },
      },
    );

    assertSuccessResult(builderStoreResult);

    describe("success cases", () => {
      it("should succeed when valid entity ID provided", () => {
        expect([
          builderStoreResult.value.getEntityIndex(
            createEntityRef("textField", "entity1"),
          ),
          builderStoreResult.value.getEntityIndex(
            createEntityRef("textField", "entity2"),
          ),
          builderStoreResult.value.getEntityIndex(
            createEntityRef("textField", "entity3"),
          ),
          builderStoreResult.value.getEntityIndex(
            createEntityRef("textField", "entity4"),
          ),
        ]).toStrictEqual([
          { success: true, value: 0 },
          { success: true, value: 1 },
          { success: true, value: 0 },
          { success: true, value: 1 },
        ]);
      });
    });

    describe("failure cases", () => {
      it("should fail when invalid entity ID provided", () => {
        const result = builderStoreResult.value.getEntityIndex(
          createEntityRef("textField", "invalidId"),
        );

        assertErrorResult(result);

        expect(result.error).toBeInstanceOf(ReferencedEntityNotFoundError);

        expect(result.error).toMatchObject({
          entityId: "invalidId",
        });
      });
    });
  });

  describe("setData", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntityDefinition(),
      },
      validateEntityId: (id) => typeof id === "string",
    });

    function makeBuilderStore() {
      const builderStoreResult = createBuilderStore(builder, {
        initialData: {
          schema: {
            entities: {
              entity1: { type: "textField", attributes: {} },
            },
            root: ["entity1"],
          },
        },
      });

      assertSuccessResult(builderStoreResult);

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
                    entity2: { type: "textField", attributes: {} },
                  },
                  root: ["entity2"],
                },
                errors: {
                  attributes: {} as EntitiesAttributesErrors<typeof builder>,
                },
              }),
            data: {
              schema: {
                entities: {
                  entity2: { type: "textField", attributes: {} },
                },
                root: ["entity2"],
              },
              errors: {
                attributes: {},
              },
            },
          },
          {
            action: () =>
              builderStore.setData({
                schema: {
                  entities: {
                    entity2: { type: "textField", attributes: {} },
                  },
                  root: ["entity2"],
                },
                errors: {
                  schema: "error" as never,
                  attributes: {} as EntitiesAttributesErrors<typeof builder>,
                },
              }),
            data: {
              schema: {
                entities: {
                  entity2: {
                    type: "textField",
                    attributes: {},
                  },
                },
                root: ["entity2"],
              },
              errors: {
                attributes: {} as EntitiesAttributesErrors<typeof builder>,
                schema: "error",
              },
            },
          },
        ];

        for (const test of tests) {
          const result = test.action();

          assertSuccessResult(result);

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
                  entity1: { type: "textField", attributes: {} },
                },
                root: ["entity1"],
              },
              errors: {
                attributes: {
                  invalidId: { invalidAttr: "error" },
                } as unknown as EntitiesAttributesErrors<typeof builder>,
              },
            }),
          expectedError: {
            instance: EntitiesAttributesErrorsParseError,
            causeInstance: ReferencedEntityNotFoundError,
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
                  entity1: { type: "textField", attributes: {} },
                },
                root: ["entity1"],
              },
              errors: {
                attributes: {
                  entity1: { invalidAttr: "error" },
                } as unknown as EntitiesAttributesErrors<typeof builder>,
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
              errors: {
                attributes: {} as EntitiesAttributesErrors<typeof builder>,
              },
            }),
          expectedError: {
            instance: SchemaStructuralError,
            causeInstance: ParseError,
          },
        },
      ])("should fail when $description", ({ action, expectedError }) => {
        const builderStore = makeBuilderStore();
        const result = action(builderStore);

        assertErrorResult(result);

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
        textField: createEntityDefinition({
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
              entity1: { type: "textField", attributes: {} },
              entity2: {
                type: "textField",
                children: ["entity3", "entity4", "entity5"],
                attributes: {},
              },
              entity3: {
                type: "textField",
                parentId: "entity2",
                attributes: {},
              },
              entity4: {
                type: "textField",
                parentId: "entity2",
                attributes: {},
              },
              entity5: {
                type: "textField",
                parentId: "entity2",
                attributes: {},
              },
            },
            root: ["entity1", "entity2"],
          },
        },
      });

      assertSuccessResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      it("should succeed when valid ID and index provided", () => {
        const builderStore = makeBuilderStore();

        const results = [
          builderStore.setEntityIndex(
            createEntityRef("textField", "entity1"),
            1,
          ),
          builderStore.setEntityIndex(
            createEntityRef("textField", "entity3"),
            1,
          ),
          builderStore.setEntityIndex(
            createEntityRef("textField", "entity5"),
            (index) => index - 2,
          ),
        ] as const;

        assertSuccessResult(results[0]);
        assertSuccessResult(results[1]);
        assertSuccessResult(results[2]);

        expect([results[0].value, results[1].value]).toStrictEqual([
          { entityRef: createEntityRef("textField", "entity1"), index: 1 },
          { entityRef: createEntityRef("textField", "entity3"), index: 1 },
        ]);

        expect(builderStore.getData().schema).toStrictEqual({
          entities: {
            entity1: { type: "textField", attributes: {} },
            entity2: {
              type: "textField",
              children: ["entity5", "entity4", "entity3"],
              attributes: {},
            },
            entity3: { type: "textField", parentId: "entity2", attributes: {} },
            entity4: { type: "textField", parentId: "entity2", attributes: {} },
            entity5: { type: "textField", parentId: "entity2", attributes: {} },
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
            instance: ReferencedEntityNotFoundError,
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

          const result = builderStore.setEntityIndex(
            createEntityRef("textField", entityId),
            index,
          );

          assertErrorResult(result);

          expect(result.error).toBeInstanceOf(expectedError.instance);

          expect(result.error).toMatchObject(expectedError.properties);
        },
      );
    });
  });

  describe("setEntityParent", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntityDefinition({
          childrenAllowed: true,
          parentAllowed: true,
        }),
        container: createEntityDefinition({
          childrenAllowed: true,
          parentAllowed: true,
        }),
        restrictedField: createEntityDefinition({
          parentRequired: true,
        }),
        noChildrenContainer: createEntityDefinition({
          childrenAllowed: false,
        }),
        rootOnlyEntity: createEntityDefinition({
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
              entity1: { type: "textField", attributes: {} },
              entity2: { type: "textField", attributes: {} },
              container1: {
                type: "container",
                children: ["entity3"],
                attributes: {},
              },
              entity3: {
                type: "textField",
                parentId: "container1",
                attributes: {},
              },
              container2: {
                type: "container",
                children: ["entity4"],
                attributes: {},
              },
              entity4: {
                type: "restrictedField",
                parentId: "container2",
                attributes: {},
              },
              rootOnlyEntity1: { type: "rootOnlyEntity", attributes: {} },
              noChildrenContainer1: {
                type: "noChildrenContainer",
                attributes: {},
              },
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

      assertSuccessResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      const successTestCases = [
        {
          description: "move entity from root to parent without index",
          action: (builderStore: ReturnType<typeof makeBuilderStore>) =>
            builderStore.setEntityParent(
              createEntityRef("textField", "entity1"),
              createEntityRef("container", "container1"),
            ),
          expectedResult: {
            entityRef: createEntityRef("textField", "entity1"),
            parentRef: createEntityRef("container", "container1"),
            index: 1,
          },
          expectedSchema: {
            entities: {
              entity1: {
                type: "textField",
                parentId: "container1",
                attributes: {},
              },
              entity2: { type: "textField", attributes: {} },
              container1: {
                type: "container",
                children: ["entity3", "entity1"],
                attributes: {},
              },
              entity3: {
                type: "textField",
                parentId: "container1",
                attributes: {},
              },
              container2: {
                type: "container",
                children: ["entity4"],
                attributes: {},
              },
              entity4: {
                type: "restrictedField",
                parentId: "container2",
                attributes: {},
              },
              rootOnlyEntity1: { type: "rootOnlyEntity", attributes: {} },
              noChildrenContainer1: {
                type: "noChildrenContainer",
                attributes: {},
              },
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
          action: (builderStore: ReturnType<typeof makeBuilderStore>) =>
            builderStore.setEntityParent(
              createEntityRef("textField", "entity2"),
              createEntityRef("container", "container1"),
              { index: 0 },
            ),
          expectedResult: {
            entityRef: createEntityRef("textField", "entity2"),
            parentRef: createEntityRef("container", "container1"),
            index: 0,
          },
          expectedSchema: {
            entities: {
              entity1: { type: "textField", attributes: {} },
              entity2: {
                type: "textField",
                parentId: "container1",
                attributes: {},
              },
              container1: {
                type: "container",
                children: ["entity2", "entity3"],
                attributes: {},
              },
              entity3: {
                type: "textField",
                parentId: "container1",
                attributes: {},
              },
              container2: {
                type: "container",
                children: ["entity4"],
                attributes: {},
              },
              entity4: {
                type: "restrictedField",
                parentId: "container2",
                attributes: {},
              },
              rootOnlyEntity1: { type: "rootOnlyEntity", attributes: {} },
              noChildrenContainer1: {
                type: "noChildrenContainer",
                attributes: {},
              },
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
          action: (builderStore: ReturnType<typeof makeBuilderStore>) =>
            builderStore.setEntityParent(
              createEntityRef("textField", "entity3"),
              undefined,
            ),
          expectedResult: {
            entityRef: createEntityRef("textField", "entity3"),
            index: 6,
            parentRef: undefined,
          },
          expectedSchema: {
            entities: {
              entity1: { type: "textField", attributes: {} },
              entity2: { type: "textField", attributes: {} },
              container1: { type: "container", children: [], attributes: {} },
              entity3: { type: "textField", attributes: {} },
              container2: {
                type: "container",
                children: ["entity4"],
                attributes: {},
              },
              entity4: {
                type: "restrictedField",
                parentId: "container2",
                attributes: {},
              },
              rootOnlyEntity1: { type: "rootOnlyEntity", attributes: {} },
              noChildrenContainer1: {
                type: "noChildrenContainer",
                attributes: {},
              },
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
          action: (builderStore: ReturnType<typeof makeBuilderStore>) =>
            builderStore.setEntityParent(
              createEntityRef("textField", "entity3"),
              undefined,
              { index: 0 },
            ),
          expectedResult: {
            entityRef: createEntityRef("textField", "entity3"),
            index: 0,
            parentRef: undefined,
          },
          expectedSchema: {
            entities: {
              entity1: { type: "textField", attributes: {} },
              entity2: { type: "textField", attributes: {} },
              container1: { type: "container", children: [], attributes: {} },
              entity3: { type: "textField", attributes: {} },
              container2: {
                type: "container",
                children: ["entity4"],
                attributes: {},
              },
              entity4: {
                type: "restrictedField",
                parentId: "container2",
                attributes: {},
              },
              rootOnlyEntity1: { type: "rootOnlyEntity", attributes: {} },
              noChildrenContainer1: {
                type: "noChildrenContainer",
                attributes: {},
              },
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
          action: (builderStore: ReturnType<typeof makeBuilderStore>) =>
            builderStore.setEntityParent(
              createEntityRef("textField", "entity4"),
              createEntityRef("container", "container1"),
            ),
          expectedResult: {
            entityRef: createEntityRef("textField", "entity4"),
            parentRef: createEntityRef("container", "container1"),
            index: 1,
          },
          expectedSchema: {
            entities: {
              entity1: { type: "textField", attributes: {} },
              entity2: { type: "textField", attributes: {} },
              container1: {
                type: "container",
                children: ["entity3", "entity4"],
                attributes: {},
              },
              entity3: {
                type: "textField",
                parentId: "container1",
                attributes: {},
              },
              container2: { type: "container", children: [], attributes: {} },
              entity4: {
                type: "restrictedField",
                parentId: "container1",
                attributes: {},
              },
              rootOnlyEntity1: { type: "rootOnlyEntity", attributes: {} },
              noChildrenContainer1: {
                type: "noChildrenContainer",
                attributes: {},
              },
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
          action: (builderStore: ReturnType<typeof makeBuilderStore>) =>
            builderStore.setEntityParent(
              createEntityRef("textField", "entity3"),
              createEntityRef("container", "container2"),
              { index: 0 },
            ),
          expectedResult: {
            entityRef: createEntityRef("textField", "entity3"),
            parentRef: createEntityRef("container", "container2"),
            index: 0,
          },
          expectedSchema: {
            entities: {
              entity1: { type: "textField", attributes: {} },
              entity2: { type: "textField", attributes: {} },
              container1: { type: "container", children: [], attributes: {} },
              entity3: {
                type: "textField",
                parentId: "container2",
                attributes: {},
              },
              container2: {
                type: "container",
                children: ["entity3", "entity4"],
                attributes: {},
              },
              entity4: {
                type: "restrictedField",
                parentId: "container2",
                attributes: {},
              },
              rootOnlyEntity1: { type: "rootOnlyEntity", attributes: {} },
              noChildrenContainer1: {
                type: "noChildrenContainer",
                attributes: {},
              },
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

          assertSuccessResult(result);

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
              createEntityRef("textField", "nonExistentEntity"),
              createEntityRef("container", "container1"),
            );
          },
          expectedError: {
            instance: ReferencedEntityNotFoundError,
            payload: { entityId: "nonExistentEntity" },
          },
        },
        {
          description: "new parent ID not found in schema",
          action: () => {
            return makeBuilderStore().setEntityParent(
              createEntityRef("textField", "entity1"),
              createEntityRef("container", "nonExistentParent"),
            );
          },
          expectedError: {
            instance: ReferencedEntityNotFoundError,
            payload: { entityId: "nonExistentParent" },
          },
        },
        {
          description: "index out of bounds in new parent",
          action: () => {
            return makeBuilderStore().setEntityParent(
              createEntityRef("textField", "entity1"),
              createEntityRef("container", "container1"),
              {
                index: 100,
              },
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
              createEntityRef("textField", "entity3"),
              undefined,
              {
                index: 100,
              },
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
              createEntityRef("textField", "entity1"),
              createEntityRef("container", "container1"),
              {
                index: -1,
              },
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
            return makeBuilderStore().setEntityParent(
              createEntityRef("textField", "entity4"),
              undefined,
            );
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
              createEntityRef("textField", "entity1"),
              createEntityRef("noChildrenContainer", "noChildrenContainer1"),
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
              createEntityRef("noChildrenContainer", "noChildrenContainer1"),
              createEntityRef("container", "container1"),
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
              createEntityRef("rootOnlyEntity", "rootOnlyEntity1"),
              createEntityRef("container", "container1"),
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

          assertErrorResult(result);

          expect(result.error).toBeInstanceOf(expectedError.instance);

          expect(result.error).toMatchObject(expectedError.payload);
        },
      );
    });
  });

  describe("setEntityAttributeValue", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntityDefinition({
          attributes: {
            label: createAttributeDefinition({
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

      assertSuccessResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      it.each([
        {
          description: "valid attribute name and value provided",
          action: (builderStore: ReturnType<typeof makeBuilderStore>) => {
            return builderStore.setEntityAttributeValue(
              createAttributeRef("textField", "entity1", "label"),
              "New Label",
            );
          },
          expectedResult: {
            attributeRef: createAttributeRef("textField", "entity1", "label"),
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

          assertSuccessResult(result);

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
            instance: ReferencedEntityNotFoundError,
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
            createAttributeRef("textField", entityId, attributeName as never),
            attributeValue as never,
          );

          assertErrorResult(result);

          expect(result.error).toBeInstanceOf(expectedError.instance);

          expect(result.error).toMatchObject(expectedError.properties);
        },
      );
    });
  });

  describe("resetEntityAttributeValue", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntityDefinition({
          attributes: {
            withDefaultValue: createAttributeDefinition({
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
              defaultValue: () => "Default Label",
            }),
            withoutDefaultValue: createAttributeDefinition({
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
                attributes: {
                  withDefaultValue: "Custom Value",
                  withoutDefaultValue: "Custom Value",
                },
              },
            },
            root: ["entity1"],
          },
        },
      });

      assertSuccessResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      it("should succeed when valid entity ID and attribute name provided", () => {
        const store = makeBuilderStore();

        const results = [
          store.resetEntityAttributeValue(
            createAttributeRef("textField", "entity1", "withDefaultValue"),
          ),
          store.resetEntityAttributeValue(
            createAttributeRef("textField", "entity1", "withoutDefaultValue"),
          ),
        ] as const;

        assertSuccessResult(results[0]);
        assertSuccessResult(results[1]);

        expect(results[0].value).toStrictEqual({
          attributeRef: createAttributeRef(
            "textField",
            "entity1",
            "withDefaultValue",
          ),
          attributeValue: "Default Label-transformed",
        });

        expect(results[1].value).toStrictEqual({
          attributeRef: createAttributeRef(
            "textField",
            "entity1",
            "withoutDefaultValue",
          ),
          attributeValue: undefined,
        });

        expect(store.getData().schema).toStrictEqual({
          entities: {
            entity1: {
              type: "textField",
              attributes: {
                withDefaultValue: "Default Label-transformed",
              },
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
            instance: ReferencedEntityNotFoundError,
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
              validAttributeNames: ["withDefaultValue", "withoutDefaultValue"],
            },
          },
        },
      ] as const)(
        "should fail when $description",
        ({ entityId, attributeName, expectedError }) => {
          const builderStore = makeBuilderStore();

          const result = builderStore.resetEntityAttributeValue(
            createAttributeRef("textField", entityId, attributeName as never),
          );

          assertErrorResult(result);

          expect(result.error).toBeInstanceOf(expectedError.instance);

          expect(result.error).toMatchObject(expectedError.properties);
        },
      );
    });
  });

  describe("clearEntityAttributeValue", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntityDefinition({
          attributes: {
            label: createAttributeDefinition({
              parse: (value) => ({ success: true, value }),
            }),
            required: createAttributeDefinition({
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

      assertSuccessResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      it("should succeed when valid entity ID and attribute name provided", () => {
        const store = makeBuilderStore();

        const result = store.clearEntityAttributeValue(
          createAttributeRef("textField", "entity1", "label"),
        );

        assertSuccessResult(result);

        expect(result.value).toStrictEqual({
          attributeRef: createAttributeRef("textField", "entity1", "label"),
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
            instance: ReferencedEntityNotFoundError,
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
            createAttributeRef("textField", entityId, attributeName as never),
          );

          assertErrorResult(result);

          expect(result.error).toBeInstanceOf(expectedError.instance);

          expect(result.error).toMatchObject(expectedError.properties);
        },
      );
    });
  });

  describe("clearEntityAttributesValues", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntityDefinition({
          attributes: {
            label: createAttributeDefinition({
              parse: (value) => ({ success: true, value }),
            }),
            required: createAttributeDefinition({
              parse: (value) => ({ success: true, value }),
            }),
            minLength: createAttributeDefinition({
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

      assertSuccessResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      it("should succeed when valid entity ID provided", () => {
        const store = makeBuilderStore();

        const result = store.clearEntityAttributesValues(
          createEntityRef("textField", "entity1"),
        );

        assertSuccessResult(result);

        expect(result.value).toStrictEqual({
          entityRef: createEntityRef("textField", "entity1"),
        });

        expect(store.getData().schema).toStrictEqual({
          entities: {
            entity1: {
              type: "textField",
              attributes: {},
            },
          },
          root: ["entity1"],
        });
      });
    });

    describe("failure cases", () => {
      it("should fail when invalid entity ID provided", () => {
        const builderStore = makeBuilderStore();

        const result = builderStore.clearEntityAttributesValues(
          createEntityRef("textField", "nonExistentEntity"),
        );

        assertErrorResult(result);

        expect(result.error).toBeInstanceOf(ReferencedEntityNotFoundError);

        expect(result.error).toMatchObject({
          entityId: "nonExistentEntity",
        });
      });
    });
  });

  describe("setEntityAttributeError", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntityDefinition({
          attributes: {
            label: createAttributeDefinition({
              parse: (value): Result<unknown, "Error"> => ({
                success: true,
                value,
              }),
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
                attributes: {},
              },
            },
            root: ["entity1"],
          },
        },
      });

      assertSuccessResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      it("should succeed when valid entity ID and attribute name provided", () => {
        const store = makeBuilderStore();

        const result = store.setEntityAttributeError(
          createAttributeRef("textField", "entity1", "label"),
          "Error",
        );

        assertSuccessResult(result);

        expect(result.value).toStrictEqual({
          entityRef: createEntityRef("textField", "entity1"),
          attributeName: "label",
          attributeError: "Error",
        });

        expect(store.getData().errors.attributes).toStrictEqual({
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
            instance: ReferencedEntityNotFoundError,
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
            createAttributeRef("textField", entityId, attributeName as never),
            error as never,
          );

          assertErrorResult(result);

          expect(result.error).toBeInstanceOf(expectedError.instance);

          expect(result.error).toMatchObject(expectedError.properties);
        },
      );
    });
  });

  describe("setEntityAttributesErrors", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntityDefinition({
          attributes: {
            label: createAttributeDefinition({
              parse: (value): Result<unknown, string> => ({
                success: true,
                value,
              }),
            }),
            required: createAttributeDefinition({
              parse: (value): Result<unknown, string> => ({
                success: true,
                value,
              }),
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
                attributes: {},
              },
            },
            root: ["entity1"],
          },
        },
      });

      assertSuccessResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      it("should succeed when valid entity ID and attribute names provided", () => {
        const store = makeBuilderStore();

        const result = store.setEntityAttributesErrors(
          createEntityRef("textField", "entity1"),
          {
            label: "Error Label",
            required: "Error Required",
          },
        );

        assertSuccessResult(result);

        expect(result.value).toStrictEqual({
          entityRef: createEntityRef("textField", "entity1"),
          attributesErrors: {
            label: "Error Label",
            required: "Error Required",
          },
        });

        expect(store.getData().errors.attributes).toStrictEqual({
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
            instance: ReferencedEntityNotFoundError,
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
            createEntityRef("textField", entityId),
            attributesErrors,
          );

          assertErrorResult(result);

          expect(result.error).toBeInstanceOf(expectedError.instance);

          expect(result.error).toMatchObject(expectedError.properties);
        },
      );
    });
  });

  describe("clearEntityAttributeError", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntityDefinition({
          attributes: {
            label: createAttributeDefinition({
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
                attributes: {},
              },
            },
            root: ["entity1"],
          },
          errors: {
            attributes: {
              entity1: {
                label: "Error",
              },
            } as unknown as EntitiesAttributesErrors<typeof builder>,
          },
        },
      });

      assertSuccessResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      it("should succeed when valid entity ID and attribute name provided", () => {
        const store = makeBuilderStore();

        const result = store.clearEntityAttributeError(
          createAttributeRef("textField", "entity1", "label"),
        );

        assertSuccessResult(result);

        expect(result.value).toStrictEqual({
          attributeRef: createAttributeRef("textField", "entity1", "label"),
        });

        expect(store.getData().errors.attributes).toStrictEqual({});
      });
    });

    describe("failure cases", () => {
      it.each([
        {
          description: "invalid entity ID provided",
          entityId: "nonExistentEntity",
          attributeName: "label",
          expectedError: {
            instance: ReferencedEntityNotFoundError,
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
              validAttributeNames: ["label"],
            },
          },
        },
      ] as const)(
        "should fail when $description",
        ({ entityId, attributeName, expectedError }) => {
          const builderStore = makeBuilderStore();

          const result = builderStore.clearEntityAttributeError(
            createAttributeRef("textField", entityId, attributeName as never),
          );

          assertErrorResult(result);

          expect(result.error).toBeInstanceOf(expectedError.instance);

          expect(result.error).toMatchObject(expectedError.properties);
        },
      );
    });
  });

  describe("clearEntityAttributesErrors", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntityDefinition({
          attributes: {
            label: createAttributeDefinition({
              parse: (value) => ({ success: true, value }),
            }),
            required: createAttributeDefinition({
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
                attributes: {},
              },
              entity2: {
                type: "textField",
                attributes: {},
              },
            },
            root: ["entity1", "entity2"],
          },
          errors: {
            attributes: {
              entity1: {
                label: "Error",
                required: "Error",
              },
              entity2: {
                label: "Label Error",
                required: "Required Error",
              },
            } as unknown as EntitiesAttributesErrors<typeof builder>,
          },
        },
      });

      assertSuccessResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      it("should succeed when valid entity ID and attribute names provided", () => {
        const store = makeBuilderStore();

        const result = store.clearEntityAttributesErrors(
          createEntityRef("textField", "entity1"),
        );

        assertSuccessResult(result);

        expect(result.value).toStrictEqual({
          entityRef: createEntityRef("textField", "entity1"),
        });

        expect(store.getData().errors.attributes).toStrictEqual({
          entity2: {
            label: "Label Error",
            required: "Required Error",
          },
        });
      });
    });

    describe("failure cases", () => {
      it("should fail when invalid entity ID provided", () => {
        const builderStore = makeBuilderStore();

        const result = builderStore.clearEntityAttributesErrors(
          createEntityRef("textField", "nonExistentEntity"),
        );

        assertErrorResult(result);

        expect(result.error).toBeInstanceOf(ReferencedEntityNotFoundError);

        expect(result.error).toMatchObject({
          entityId: "nonExistentEntity",
        });
      });
    });
  });

  describe("clearEntitiesAttributesErrors", () => {
    describe("success cases", () => {
      it("should succeed always", () => {
        const builder = createBuilder({
          entities: {
            textField: createEntityDefinition({
              attributes: {
                label: createAttributeDefinition({
                  parse: (value) => ({ success: true, value }),
                }),
                required: createAttributeDefinition({
                  parse: (value) => ({ success: true, value }),
                }),
              },
            }),
          },
          validateEntityId: (id) => typeof id === "string",
        });

        const builderStoreResult = createBuilderStore(builder, {
          initialData: {
            schema: {
              entities: {
                entity1: {
                  type: "textField",
                  attributes: {},
                },
                entity2: {
                  type: "textField",
                  attributes: {},
                },
              },
              root: ["entity1", "entity2"],
            },
            errors: {
              attributes: {
                entity1: {
                  label: "Error",
                  required: "Error",
                },
                entity2: {
                  label: "Label Error",
                  required: "Required Error",
                },
              } as unknown as EntitiesAttributesErrors<typeof builder>,
            },
          },
        });

        assertSuccessResult(builderStoreResult);

        const result = builderStoreResult.value.clearEntitiesAttributesErrors();

        assertSuccessResult(result);

        expect(result.value).toBeUndefined();

        expect(
          builderStoreResult.value.getData().errors.attributes,
        ).toStrictEqual({});
      });
    });
  });

  describe("setEntitiesAttributesErrors", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntityDefinition({
          attributes: {
            label: createAttributeDefinition({
              parse: (value): Result<unknown, string> => ({
                success: true,
                value,
              }),
            }),
            required: createAttributeDefinition({
              parse: (value): Result<unknown, string> => ({
                success: true,
                value,
              }),
            }),
          },
        }),
        container: createEntityDefinition({
          attributes: {
            title: createAttributeDefinition({
              parse: (value): Result<unknown, string> => ({
                success: true,
                value,
              }),
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
                attributes: {},
              },
              entity2: {
                type: "container",
                attributes: {},
              },
            },
            root: ["entity1", "entity2"],
          },
          errors: {
            attributes: {} as EntitiesAttributesErrors<typeof builder>,
          },
        },
      });

      assertSuccessResult(builderStoreResult);

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
          } as unknown as EntitiesAttributesErrors<typeof builder>,
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
          attributesErrors: {} as EntitiesAttributesErrors<typeof builder>,
          expectedData: {},
        },
        {
          description: "partial entities attribute errors provided",
          attributesErrors: {
            entity1: {
              label: "Label Error",
            },
          } as unknown as EntitiesAttributesErrors<typeof builder>,
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

          assertSuccessResult(result);

          expect(result.value).toStrictEqual({
            attributesErrors,
          });

          expect(store.getData().errors.attributes).toStrictEqual(expectedData);
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
          } as unknown as EntitiesAttributesErrors<typeof builder>,
          expectedError: {
            instance: EntitiesAttributesErrorsParseError,
            causeInstance: ReferencedEntityNotFoundError,
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
          } as unknown as EntitiesAttributesErrors<typeof builder>,
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
          } as unknown as EntitiesAttributesErrors<typeof builder>,
          expectedError: {
            instance: EntitiesAttributesErrorsParseError,
            causeInstance: ReferencedEntityNotFoundError,
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
          } as unknown as EntitiesAttributesErrors<typeof builder>,
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

          assertErrorResult(result);

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
        textField: createEntityDefinition({
          attributes: {
            parse: createAttributeDefinition({
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
            parseAndRefine: createAttributeDefinition(
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
            failedAttribute: createAttributeDefinition({
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

      assertSuccessResult(builderStoreResult);

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
            errors: {
              attributes: {
                entity1: {
                  parse: "must be a string",
                  parseAndRefine: "must be a string",
                  failedAttribute: "failure",
                },
              } as unknown as EntitiesAttributesErrors<typeof builder>,
            },
          },
          expectedResult: {
            attributeRef: createAttributeRef("textField", "entity1", "parse"),
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
            errors: {
              attributes: {
                entity1: {
                  failedAttribute: "failure",
                  parseAndRefine: "must be a string",
                },
              },
            },
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
            errors: {
              attributes: {
                entity1: {
                  failedAttribute: "failure",
                },
              } as unknown as EntitiesAttributesErrors<typeof builder>,
            },
          },
          expectedResult: {
            attributeRef: createAttributeRef(
              "textField",
              "entity1",
              "parseAndRefine",
            ),
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
            errors: {
              attributes: {
                entity1: {
                  failedAttribute: "failure",
                },
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
            createAttributeRef("textField", entityId, attributeName),
          );

          assertSuccessResult(result);

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
            instance: ReferencedEntityNotFoundError,
            properties: {
              entityId: "nonExistentEntity",
            },
          },
          initialData: {
            schema: {
              entities: {},
              root: [],
            },
            errors: {
              attributes: {} as EntitiesAttributesErrors<typeof builder>,
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
                  attributes: {},
                },
              },
              root: ["entity1"],
            },
            errors: {
              attributes: {} as EntitiesAttributesErrors<typeof builder>,
            },
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
                  attributes: {},
                },
              },
              root: ["entity1"],
            },
            errors: {
              attributes: {
                entity1: {
                  parse: "must be a string",
                },
              } as unknown as EntitiesAttributesErrors<typeof builder>,
            },
          },
          expectedData: {
            schema: {
              entities: {
                entity1: {
                  type: "textField",
                  attributes: {},
                },
              },
              root: ["entity1"],
            },
            errors: {
              attributes: {
                entity1: {
                  parse: "must be a string",
                },
              } as unknown as EntitiesAttributesErrors<typeof builder>,
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
            errors: {
              attributes: {
                entity1: {
                  parseAndRefine: "Refine fail",
                },
              } as unknown as EntitiesAttributesErrors<typeof builder>,
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
            errors: {
              attributes: {
                entity1: {
                  parseAndRefine: "Refine fail",
                },
              } as unknown as EntitiesAttributesErrors<typeof builder>,
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
            createAttributeRef("textField", entityId, attributeName as never),
          );

          assertErrorResult(result);

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
        textField: createEntityDefinition({
          attributes: {
            label: createAttributeDefinition(
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
            shouldFail: createAttributeDefinition(
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
          errors: {
            attributes: {
              entity1: {
                label: "must be a string",
                shouldFail: "must not be 'fail'",
              },
            } as unknown as EntitiesAttributesErrors<typeof builder>,
          },
        },
      });

      assertSuccessResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      it("should succeed when all attributes are valid", async () => {
        const store = makeBuilderStore();

        const result = await store.validateEntityAttributes(
          createEntityRef("textField", "entity1"),
        );

        assertSuccessResult(result);

        expect(result.value).toStrictEqual({
          entityRef: createEntityRef("textField", "entity1"),
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
          errors: {
            attributes: {},
          },
        });
      });
    });

    describe("failure cases", () => {
      it("should fail when some attributes are invalid", async () => {
        const store = makeBuilderStore();

        assertSuccessResult(
          store.setEntityAttributeValue(
            createAttributeRef("textField", "entity1", "shouldFail"),
            "fail",
          ),
        );

        const result = await store.validateEntityAttributes(
          createEntityRef("textField", "entity1"),
        );

        assertErrorResult(result);

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
          errors: {
            attributes: {
              entity1: {
                shouldFail: "must not be 'fail-parsed'",
              },
            },
          },
        });
      });
    });
  });

  describe("validateEntitiesAttributes", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntityDefinition({
          attributes: {
            label: createAttributeDefinition(
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
          errors: {
            attributes: {
              entity1: {
                label: "must be a string",
              },
            } as unknown as EntitiesAttributesErrors<typeof builder>,
          },
        },
      });

      assertSuccessResult(builderStoreResult);

      return builderStoreResult.value;
    }

    describe("success cases", () => {
      it("should succeed when all attributes are valid", async () => {
        const store = makeBuilderStore();

        const result = await store.validateEntitiesAttributes();

        assertSuccessResult(result);

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
          errors: {
            attributes: {},
          },
        });
      });
    });

    describe("error cases", () => {
      it("should fail when some attributes are invalid", async () => {
        const store = makeBuilderStore();

        store.setEntityAttributeValue(
          createAttributeRef("textField", "entity1", "label"),
          "fail",
        );

        store.setEntityAttributeValue(
          createAttributeRef("textField", "entity2", "label"),
          "fail",
        );

        const result = await store.validateEntitiesAttributes();

        assertErrorResult(result);

        expect(result.error).toBeInstanceOf(EntitiesAttributesValidationError);

        expect(result.error).toMatchObject({
          errors: {
            entity2: {
              label: "must not be 'fail-parsed'",
            },
          },
        });

        expect(store.getData()).toStrictEqual({
          errors: {
            attributes: {
              entity1: {
                label: "must not be 'fail-parsed'",
              },
              entity2: {
                label: "must not be 'fail-parsed'",
              },
            },
          },
          schema: {
            entities: {
              entity1: {
                type: "textField",
                attributes: {},
              },
              entity2: {
                type: "textField",
                attributes: {},
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
        const builderStoreResult = createBuilderStore(
          createBuilder({
            entities: {},
            refineSchema: () => ({
              success: false,
              error: "invalid schema" as const,
            }),
          }),
        );

        assertSuccessResult(builderStoreResult);

        const result =
          builderStoreResult.value.setSchemaError("invalid schema");

        assertSuccessResult(result);

        expect(result.value).toStrictEqual({
          schemaError: "invalid schema",
        });

        expect(builderStoreResult.value.getData().errors.schema).toStrictEqual(
          "invalid schema",
        );
      });
    });
  });

  describe("clearSchemaError", () => {
    describe("success cases", () => {
      it("should succeed always", () => {
        const builderStoreResult = createBuilderStore(
          createBuilder({
            entities: {},
            refineSchema: () => ({
              success: false,
              error: "invalid schema" as const,
            }),
          }),
          {
            initialData: {
              errors: {
                schema: "invalid schema",
              },
            },
          },
        );

        assertSuccessResult(builderStoreResult);

        const result = builderStoreResult.value.clearSchemaError();

        assertSuccessResult(result);

        expect(result.value).toBeUndefined();

        expect(builderStoreResult.value.getData()).toStrictEqual({
          errors: {
            attributes: {},
          },
          schema: {
            entities: {},
            root: [],
          },
        });
      });
    });
  });

  describe("cloneEntity", () => {
    describe("success cases", () => {
      function makeBuilderStore() {
        let id = 1;

        const builder = createBuilder({
          entities: {
            textField: createEntityDefinition({
              childrenAllowed: true,
              attributes: {
                label: createAttributeDefinition({
                  parse: (value) => ({ success: true, value }),
                }),
              },
            }),
          },
          validateEntityId: (id) => typeof id === "string",
          generateEntityId: () => (id++).toString(),
        });

        const builderStoreResult = createBuilderStore(builder, {
          initialData: {
            schema: {
              entities: {
                entity1: {
                  type: "textField",
                  children: ["entity2"],
                  attributes: {
                    label: "Label",
                  },
                },
                entity2: {
                  type: "textField",
                  parentId: "entity1",
                  children: ["entity3"],
                  attributes: {},
                },
                entity3: {
                  type: "textField",
                  parentId: "entity2",
                  attributes: {},
                },
              },
              root: ["entity1"],
            },
          },
        });

        assertSuccessResult(builderStoreResult);

        return builderStoreResult.value;
      }

      it("should succeed when valid entity ID provided, with and without index", () => {
        const builderStore = makeBuilderStore();

        const results = [
          builderStore.cloneEntity(createEntityRef("textField", "entity1")),
          builderStore.cloneEntity(createEntityRef("textField", "entity2"), {
            index: 0,
          }),
        ] as const;

        assertSuccessResult(results[0]);

        assertSuccessResult(results[1]);

        expect(results).toStrictEqual([
          {
            success: true,
            value: {
              sourceEntityRef: createEntityRef("textField", "entity1"),
              clonedEntityRef: createEntityRef("textField", "1"),
              index: 1,
            },
          },
          {
            success: true,
            value: {
              sourceEntityRef: createEntityRef("textField", "entity2"),
              clonedEntityRef: createEntityRef("textField", "4"),
              index: 0,
            },
          },
        ]);

        expect(builderStore.getData().schema).toStrictEqual({
          entities: {
            entity1: {
              type: "textField",
              children: ["4", "entity2"],
              attributes: {
                label: "Label",
              },
            },
            entity2: {
              type: "textField",
              parentId: "entity1",
              children: ["entity3"],
              attributes: {},
            },
            entity3: { type: "textField", parentId: "entity2", attributes: {} },
            "1": {
              type: "textField",
              children: ["2"],
              attributes: {
                label: "Label",
              },
            },
            "2": {
              type: "textField",
              parentId: "1",
              children: ["3"],
              attributes: {},
            },
            "3": { type: "textField", parentId: "2", attributes: {} },
            "4": {
              children: ["5"],
              parentId: "entity1",
              type: "textField",
              attributes: {},
            },
            "5": {
              parentId: "4",
              type: "textField",
              attributes: {},
            },
          },
          root: ["entity1", "1"],
        });
      });
    });

    describe("failure cases", () => {
      it.each([
        {
          description: "invalid entity ID provided",
          entityId: "nonExistentEntity",
          expectedError: {
            instance: ReferencedEntityNotFoundError,
            properties: {
              entityId: "nonExistentEntity",
            },
          },
        },
        {
          description: "invalid index provided",
          entityId: "entity1",
          index: 2,
          generatedId: "valid",
          expectedError: {
            instance: IndexOutOfBoundsError,
            properties: {
              index: 2,
            },
          },
        },
        {
          description: "duplicate entity ID generated",
          entityId: "entity1",
          generatedId: "entity1",
          expectedError: {
            instance: EntityIdAlreadyExistsError,
            properties: {
              entityId: "entity1",
            },
          },
        },
        {
          description: "invalid entity ID generated",
          entityId: "entity1",
          generatedId: "invalid",
          expectedError: {
            instance: InvalidEntityIdError,
            properties: {
              entityId: "invalid",
            },
          },
        },
      ] as const)(
        "should fail with $description",
        ({ entityId, expectedError, index, generatedId }) => {
          const builder = createBuilder({
            entities: {
              textField: createEntityDefinition(),
            },
            validateEntityId: (id) => id !== "invalid",
            generateEntityId: () => generatedId ?? randomUUID(),
          });

          const builderStoreResult = createBuilderStore(builder, {
            initialData: {
              schema: {
                entities: {
                  entity1: {
                    type: "textField",
                    attributes: {},
                  },
                },
                root: ["entity1"],
              },
            },
          });

          assertSuccessResult(builderStoreResult);

          const result = builderStoreResult.value.cloneEntity(
            createEntityRef("textField", entityId),
            index ? { index } : undefined,
          );

          assertErrorResult(result);

          expect(result.error).toBeInstanceOf(expectedError.instance);

          expect(result.error).toMatchObject(expectedError.properties);
        },
      );
    });
  });
});
