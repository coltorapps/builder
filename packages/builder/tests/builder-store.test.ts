import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  createAttribute,
  createBuilder,
  createBuilderStore,
  createEntity,
} from "../src";
import * as debounceManagerExports from "../src/debounce-manager";
import * as schemaExports from "../src/schema";
import * as uuidExports from "../src/uuid";

describe("builder store", () => {
  it("can be created without a schema", () => {
    const validateSchemaIntegrityMock = vi.spyOn(
      schemaExports,
      "validateSchemaIntegrity",
    );

    const builder = createBuilder({
      entities: [],
    });

    const builderStore = createBuilderStore({ builder });

    expect(validateSchemaIntegrityMock).toHaveBeenCalledWith(
      {
        entities: {},
        root: [],
      },
      builder,
    );

    expect(builderStore).toMatchSnapshot();
  });

  it("can be created with a non-empty schema", () => {
    const validateSchemaIntegrityMock = vi.spyOn(
      schemaExports,
      "validateSchemaIntegrity",
    );

    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          attributes: [
            createAttribute({
              name: "label",
              validate(value) {
                return value;
              },
            }),
          ],
        }),
      ],
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "text",
              attributes: {
                label: "test",
              },
            },
          },
          root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
      },
    });

    expect(validateSchemaIntegrityMock).toMatchSnapshot();

    expect(builderStore).toMatchSnapshot();
  });

  it("can be created with an empty schema", () => {
    const validateSchemaIntegrityMock = vi.spyOn(
      schemaExports,
      "validateSchemaIntegrity",
    );

    const builder = createBuilder({
      entities: [],
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {},
          root: [],
        },
      },
    });

    expect(validateSchemaIntegrityMock).toMatchSnapshot();

    expect(builderStore).toMatchSnapshot();
  });

  it("can retrieve the data", () => {
    const validateSchemaIntegrityMock = vi.spyOn(
      schemaExports,
      "validateSchemaIntegrity",
    );

    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          attributes: [
            createAttribute({
              name: "label",
              validate(value) {
                return value;
              },
            }),
          ],
        }),
      ],
    });

    const schema = {
      entities: {
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "text",
          attributes: {
            label: "test",
          },
        },
      },
      root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
    } as const;

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            label: "Some error",
          },
        },
        schema,
      },
    });

    expect(builderStore.getData()).toMatchSnapshot();

    expect(validateSchemaIntegrityMock).toHaveBeenCalledWith(schema, builder);
  });

  it("can set the data", () => {
    const validateSchemaIntegrityMock = vi.spyOn(
      schemaExports,
      "validateSchemaIntegrity",
    );

    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          attributes: [
            createAttribute({
              name: "label",
              validate(value) {
                return value;
              },
            }),
          ],
        }),
      ],
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {},
          root: [],
        },
      },
    });

    const listener = vi.fn();

    builderStore.subscribe(listener);

    const schema = {
      entities: {
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "text",
          attributes: {
            label: "test",
          },
        },
      },
      root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
    } as const;

    builderStore.setData({
      schema,
      entitiesAttributesErrors: {
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          label: "some error",
        },
      },
    });

    expect(validateSchemaIntegrityMock).toHaveBeenCalledWith(schema, builder);

    expect(listener).toMatchSnapshot();

    expect(builderStore.getData()).toMatchSnapshot();
  });

  it("can return the data", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          attributes: [
            createAttribute({
              name: "label",
              validate(value) {
                return value;
              },
            }),
          ],
        }),
      ],
    });

    const schema = {
      entities: {
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "text",
          attributes: {
            label: "test",
          },
        },
      },
      root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
    } as const;

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            label: "some error",
          },
        },
        schema,
      },
    });

    expect(builderStore.getData()).toMatchSnapshot();
  });

  it("can delete entities and cascade delete their children", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
      childrenAllowed: {
        test: true,
      },
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {},
          "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {},
          "3dc165dd-88d4-4884-ac8a-5d107d023e54": {},
          "49e91328-02bc-4daa-ab56-619554e85cff": {},
        },
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              attributes: {},
              parentId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
            },
            "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
              type: "test",
              attributes: {},
              children: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
              parentId: "3dc165dd-88d4-4884-ac8a-5d107d023e54",
            },
            "3dc165dd-88d4-4884-ac8a-5d107d023e54": {
              type: "test",
              attributes: {},
              children: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
            },
            "49e91328-02bc-4daa-ab56-619554e85cff": {
              type: "test",
              attributes: {},
              children: [],
            },
          },
          root: [
            "3dc165dd-88d4-4884-ac8a-5d107d023e54",
            "49e91328-02bc-4daa-ab56-619554e85cff",
          ],
        },
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    builderStore.deleteEntity("3dc165dd-88d4-4884-ac8a-5d107d023e54");

    expect(builderStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("throws when trying to delete non existent entity", () => {
    const builder = createBuilder({ entities: [] });

    expect(() =>
      createBuilderStore({ builder }).deleteEntity("test"),
    ).toThrowErrorMatchingSnapshot();
  });

  it("throws when adding an entity with an already existent ID", () => {
    vi.spyOn(uuidExports, "generateUuid").mockImplementation(
      () => "6e0035c3-0d4c-445f-a42b-2d971225447c",
    );

    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
      childrenAllowed: {
        test: true,
      },
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              attributes: {},
            },
          },
          root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
      },
    });

    expect(() =>
      builderStore.addEntity({
        type: "test",
        attributes: {},
      }),
    ).toThrowErrorMatchingSnapshot();
  });

  it("throws when adding an entity without a parent when parent is required", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
      parentRequired: ["test"],
    });

    const builderStore = createBuilderStore({ builder });

    expect(() =>
      builderStore.addEntity({
        type: "test",
        attributes: {},
      }),
    ).toThrowErrorMatchingSnapshot();
  });

  it("throws when adding an entity to a non-allowed parent", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              attributes: {},
            },
          },
          root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
        },
      },
    });

    expect(() =>
      builderStore.addEntity({
        type: "test",
        attributes: {},
        parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
      }),
    ).toThrowErrorMatchingSnapshot();
  });

  it("throws when moving an entity to the root when parent is required", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "section",
        }),
        createEntity({
          name: "text",
        }),
      ],
      childrenAllowed: {
        section: true,
      },
      parentRequired: ["text"],
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "text",
              attributes: {},
              parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
            },
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "section",
              attributes: {},
              children: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
            },
          },
          root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
        },
      },
    });

    expect(() =>
      builderStore.unsetEntityParent("6e0035c3-0d4c-445f-a42b-2d971225447c"),
    ).toThrowErrorMatchingSnapshot();
  });

  it("throws moving an entity to a non-allowed parent", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              attributes: {},
            },
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              attributes: {},
            },
          },
          root: [
            "51324b32-adc3-4d17-a90e-66b5453935bd",
            "6e0035c3-0d4c-445f-a42b-2d971225447c",
          ],
        },
      },
    });

    expect(() =>
      builderStore.setEntityParent(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "51324b32-adc3-4d17-a90e-66b5453935bd",
      ),
    ).toThrowErrorMatchingSnapshot();
  });

  it("throws when adding an entity with a non-existent attribute", () => {
    vi.spyOn(uuidExports, "generateUuid").mockImplementation(
      () => "6e0035c3-0d4c-445f-a42b-2d971225447c",
    );

    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
    });

    const builderStore = createBuilderStore({ builder });

    expect(() =>
      builderStore.addEntity({
        type: "test",
        attributes: {
          invalid: 1,
        },
      }),
    ).toThrowErrorMatchingSnapshot();
  });

  it("can add entities to root", () => {
    vi.spyOn(uuidExports, "generateUuid").mockImplementation(
      () => "6e0035c3-0d4c-445f-a42b-2d971225447c",
    );

    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
      childrenAllowed: {
        test: true,
      },
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              attributes: {},
            },
          },
          root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
        },
      },
    });

    builderStore.addEntity({
      type: "test",
      attributes: {},
    });

    expect(builderStore.getData()).toMatchSnapshot();
  });

  it("can add entities to root at specific index", () => {
    vi.spyOn(uuidExports, "generateUuid").mockImplementation(
      () => "6e0035c3-0d4c-445f-a42b-2d971225447c",
    );

    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
      childrenAllowed: {
        test: true,
      },
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              attributes: {},
            },
          },
          root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
        },
      },
    });

    builderStore.addEntity({
      type: "test",
      attributes: {},
      index: 0,
    });

    expect(builderStore.getData()).toMatchSnapshot();
  });

  it("can add entities to a parent entity", () => {
    vi.spyOn(uuidExports, "generateUuid").mockImplementation(
      () => "6e0035c3-0d4c-445f-a42b-2d971225447c",
    );

    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
      childrenAllowed: {
        test: true,
      },
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              attributes: {},
            },
          },
          root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
        },
      },
    });

    builderStore.addEntity({
      type: "test",
      attributes: {},
      parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
    });

    expect(builderStore.getData()).toMatchSnapshot();
  });

  it("can add entities to a parent entity at a specific index", () => {
    vi.spyOn(uuidExports, "generateUuid").mockImplementation(
      () => "6e0035c3-0d4c-445f-a42b-2d971225447c",
    );

    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
      childrenAllowed: {
        test: true,
      },
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              attributes: {},
              children: ["a02cd91c-d982-4e80-8fa4-184e9fe2b0b5"],
            },
            "a02cd91c-d982-4e80-8fa4-184e9fe2b0b5": {
              type: "test",
              attributes: {},
              parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
            },
          },
          root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
        },
      },
    });

    builderStore.addEntity({
      type: "test",
      attributes: {},
      parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
      index: 0,
    });

    expect(builderStore.getData()).toMatchSnapshot();
  });

  it("can move an entity in root", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              attributes: {},
            },
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              attributes: {},
            },
          },
          root: [
            "51324b32-adc3-4d17-a90e-66b5453935bd",
            "6e0035c3-0d4c-445f-a42b-2d971225447c",
          ],
        },
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    builderStore.unsetEntityParent(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
      0,
    );

    expect(builderStore.getData()).toMatchSnapshot();

    builderStore.unsetEntityParent(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
      1,
    );

    expect(builderStore.getData()).toMatchSnapshot();

    builderStore.unsetEntityParent("6e0035c3-0d4c-445f-a42b-2d971225447c");

    expect(builderStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can move an entity to root", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
      childrenAllowed: {
        test: true,
      },
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              attributes: {},
              children: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
            },
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              attributes: {},
              parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
            },
          },
          root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
        },
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    builderStore.unsetEntityParent("6e0035c3-0d4c-445f-a42b-2d971225447c");

    expect(builderStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can move an entity to root at a specific index", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
      childrenAllowed: {
        test: true,
      },
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              attributes: {},
              children: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
            },
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              attributes: {},
              parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
            },
          },
          root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
        },
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    builderStore.unsetEntityParent(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
      0,
    );

    expect(builderStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can move an entity from root to a parent entity", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
      childrenAllowed: {
        test: true,
      },
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              attributes: {},
              children: ["a02cd91c-d982-4e80-8fa4-184e9fe2b0b5"],
            },
            "a02cd91c-d982-4e80-8fa4-184e9fe2b0b5": {
              type: "test",
              attributes: {},
              parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
            },
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              attributes: {},
            },
          },
          root: [
            "51324b32-adc3-4d17-a90e-66b5453935bd",
            "6e0035c3-0d4c-445f-a42b-2d971225447c",
          ],
        },
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    builderStore.setEntityParent(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
      "51324b32-adc3-4d17-a90e-66b5453935bd",
    );

    expect(builderStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can move an entity from root to a parent entity at a specific index", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
      childrenAllowed: {
        test: true,
      },
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              attributes: {},
              children: ["a02cd91c-d982-4e80-8fa4-184e9fe2b0b5"],
            },
            "a02cd91c-d982-4e80-8fa4-184e9fe2b0b5": {
              type: "test",
              attributes: {},
              parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
            },
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              attributes: {},
            },
          },
          root: [
            "51324b32-adc3-4d17-a90e-66b5453935bd",
            "6e0035c3-0d4c-445f-a42b-2d971225447c",
          ],
        },
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    builderStore.setEntityParent(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
      "51324b32-adc3-4d17-a90e-66b5453935bd",
      0,
    );

    expect(builderStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can move an entity in a parent entity", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
      childrenAllowed: {
        test: true,
      },
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              attributes: {},
              children: [
                "a02cd91c-d982-4e80-8fa4-184e9fe2b0b5",
                "6e0035c3-0d4c-445f-a42b-2d971225447c",
              ],
            },
            "a02cd91c-d982-4e80-8fa4-184e9fe2b0b5": {
              type: "test",
              attributes: {},
              parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
            },
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              attributes: {},
              parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
            },
          },
          root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
        },
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    builderStore.setEntityParent(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
      "51324b32-adc3-4d17-a90e-66b5453935bd",
      0,
    );

    expect(builderStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("throws when trying to move a non existent entity", () => {
    const builder = createBuilder({
      entities: [],
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {},
          root: [],
        },
      },
    });

    expect(() =>
      builderStore.setEntityParent("invalid", "invalid"),
    ).toThrowErrorMatchingSnapshot();

    expect(() =>
      builderStore.unsetEntityParent("invalid"),
    ).toThrowErrorMatchingSnapshot();
  });

  it("throws when trying to move an entity to a non existent parent entity", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
      childrenAllowed: {
        test: true,
      },
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              attributes: {},
            },
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              attributes: {},
            },
          },
          root: [
            "6e0035c3-0d4c-445f-a42b-2d971225447c",
            "51324b32-adc3-4d17-a90e-66b5453935bd",
          ],
        },
      },
    });

    expect(() =>
      builderStore.setEntityParent(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "invalid",
      ),
    ).toThrowErrorMatchingSnapshot();
  });

  it("throws when setting a parent id to the only root entity", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              attributes: {},
            },
          },
          root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
      },
    });

    expect(() =>
      builderStore.setEntityParent(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "some id",
      ),
    ).toThrowErrorMatchingSnapshot();
  });

  it("throws when setting an entity parent id to its grandchild", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
      childrenAllowed: {
        test: true,
      },
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              attributes: {},
              children: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
            },
            "0a97c57c-7743-403c-8105-a8c09eb5ab52": {
              type: "test",
              attributes: {},
            },
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              attributes: {},
              parentId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
              children: ["4fb898fb-7207-4952-8e5e-511953a42e2c"],
            },
            "4fb898fb-7207-4952-8e5e-511953a42e2c": {
              type: "test",
              attributes: {},
              parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
            },
          },
          root: [
            "6e0035c3-0d4c-445f-a42b-2d971225447c",
            "0a97c57c-7743-403c-8105-a8c09eb5ab52",
          ],
        },
      },
    });

    expect(() =>
      builderStore.setEntityParent(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "4fb898fb-7207-4952-8e5e-511953a42e2c",
      ),
    ).toThrowErrorMatchingSnapshot();
  });

  it("throws when trying to add an entity to a non existent parent entity", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {},
          root: [],
        },
      },
    });

    expect(() =>
      builderStore.addEntity({
        type: "test",
        attributes: {},
        parentId: "invalid",
      }),
    ).toThrowErrorMatchingSnapshot();
  });

  it("can update entity attributes", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "select",
          attributes: [
            createAttribute({
              name: "label",
              validate(value) {
                return z.string().parse(value);
              },
            }),
            createAttribute({
              name: "required",
              validate(value) {
                return z.boolean().parse(value);
              },
            }),
          ],
        }),
        createEntity({
          name: "text",
          attributes: [
            createAttribute({
              name: "maxLength",
              validate(value) {
                return z.number().parse(value);
              },
            }),
          ],
        }),
      ],
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "select",
              attributes: {
                label: "Old label",
                required: true,
              },
            },
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "text",
              attributes: {
                maxLength: 1,
              },
            },
          },
          root: [
            "6e0035c3-0d4c-445f-a42b-2d971225447c",
            "51324b32-adc3-4d17-a90e-66b5453935bd",
          ],
        },
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    builderStore.setEntityAttribute(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
      "label",
      "New label",
    );

    builderStore.setEntityAttribute(
      "51324b32-adc3-4d17-a90e-66b5453935bd",
      "maxLength",
      1,
    );

    expect(builderStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("throws when updating an attribute of a non-existent entity", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {},
          root: [],
        },
      },
    });

    expect(() =>
      builderStore.setEntityAttribute("invalid", "", ""),
    ).toThrowErrorMatchingSnapshot();
  });

  it("throws when updating an non-existent attribute of an entity", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
          attributes: [
            createAttribute({
              name: "maxLength",
              validate(value) {
                return z.number().parse(value);
              },
            }),
          ],
        }),
      ],
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              // @ts-expect-error Intentional wrong data type
              attributes: {},
            },
          },
          root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
      },
    });

    expect(() =>
      builderStore.setEntityAttribute(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        // @ts-expect-error Intentional wrong data type
        "invalid",
        "",
      ),
    ).toThrowErrorMatchingSnapshot();
  });

  it("can change entity's index", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
      childrenAllowed: {
        test: true,
      },
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        entitiesAttributesErrors: {},
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              attributes: {},
            },
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              attributes: {},
              children: [
                "eedf598e-1422-469a-acb1-b2d8bfabb0f3",
                "7c3cf1e5-c35d-49c0-80ca-e8000ac8095e",
              ],
            },
            "eedf598e-1422-469a-acb1-b2d8bfabb0f3": {
              type: "test",
              attributes: {},
              parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
            },
            "7c3cf1e5-c35d-49c0-80ca-e8000ac8095e": {
              type: "test",
              attributes: {},
              parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
            },
          },
          root: [
            "51324b32-adc3-4d17-a90e-66b5453935bd",
            "6e0035c3-0d4c-445f-a42b-2d971225447c",
          ],
        },
      },
    });

    builderStore.setEntityIndex("6e0035c3-0d4c-445f-a42b-2d971225447c", 0);

    builderStore.setEntityIndex("7c3cf1e5-c35d-49c0-80ca-e8000ac8095e", 0);

    expect(builderStore.getData()).toMatchSnapshot();
  });

  it("can validate a single entity attribute", async () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
          attributes: [
            createAttribute({
              name: "label",
              validate(value) {
                return z.string().parse(value);
              },
            }),
          ],
        }),
      ],
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              attributes: {
                // @ts-expect-error Intentional wrong data type
                label: 1,
              },
            },
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              // @ts-expect-error Intentional wrong data type
              attributes: {},
            },
          },
          root: [
            "6e0035c3-0d4c-445f-a42b-2d971225447c",
            "51324b32-adc3-4d17-a90e-66b5453935bd",
          ],
        },
        entitiesAttributesErrors: {},
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    await expect(
      builderStore.validateEntityAttribute(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "label",
      ),
    ).resolves.toEqual(undefined);

    await expect(
      builderStore.validateEntityAttribute(
        "51324b32-adc3-4d17-a90e-66b5453935bd",
        "label",
      ),
    ).resolves.toEqual(undefined);

    expect(builderStore.getData()).toMatchSnapshot();

    await expect(
      builderStore.validateEntityAttribute("invalid", "label"),
    ).rejects.toThrowErrorMatchingSnapshot();

    await expect(
      builderStore.validateEntityAttribute(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        // @ts-expect-error Intentional wrong data type
        "invalid",
      ),
    ).rejects.toThrowErrorMatchingSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can validate a all attributes of a single entity", async () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
          attributes: [
            createAttribute({
              name: "label",
              validate(value) {
                return z.string().parse(value);
              },
            }),
            createAttribute({
              name: "maxLength",
              validate(value) {
                return z.number().parse(value);
              },
            }),
          ],
        }),
      ],
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              attributes: {
                // @ts-expect-error Intentional wrong data type
                label: 1,
                // @ts-expect-error Intentional wrong data type
                maxLength: "1",
              },
            },
          },
          root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
        entitiesAttributesErrors: {},
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    await builderStore.validateEntityAttributes(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
    );

    expect(builderStore.getData()).toMatchSnapshot();

    await expect(
      builderStore.validateEntityAttributes("invalid"),
    ).rejects.toThrowErrorMatchingSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can validate a all attributes of all entities", async () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
          attributes: [
            createAttribute({
              name: "label",
              validate(value) {
                return z.string().parse(value);
              },
            }),
            createAttribute({
              name: "maxLength",
              validate(value) {
                return z.number().parse(value);
              },
            }),
          ],
        }),
      ],
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              attributes: {
                // @ts-expect-error Intentional wrong data type
                label: 1,
                maxLength: 1,
              },
            },
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              attributes: {
                label: "test",
                // @ts-expect-error Intentional wrong data type
                maxLength: "1",
              },
            },
          },
          root: [
            "6e0035c3-0d4c-445f-a42b-2d971225447c",
            "51324b32-adc3-4d17-a90e-66b5453935bd",
          ],
        },
        entitiesAttributesErrors: {},
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    await builderStore.validateEntitiesAttributes();

    expect(builderStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can set a single entity attribute error", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
          attributes: [
            createAttribute({
              name: "label",
              validate(value) {
                return value;
              },
            }),
            createAttribute({
              name: "title",
              validate(value) {
                return value;
              },
            }),
          ],
        }),
      ],
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              attributes: {},
            },
          },
          root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
        entitiesAttributesErrors: {},
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    expect(
      builderStore.setEntityAttributeError(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "label",
        "Some error",
      ),
    ).toEqual(undefined);

    expect(
      builderStore.setEntityAttributeError(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "title",
        "Title error",
      ),
    ).toEqual(undefined);

    expect(builderStore.getData()).toMatchSnapshot();

    expect(() =>
      builderStore.setEntityAttributeError("invalid", "title", "error"),
    ).toThrowErrorMatchingSnapshot();

    expect(() =>
      builderStore.setEntityAttributeError(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        // @ts-expect-error Intentional wrong data type
        "invalid",
        "error",
      ),
    ).toThrowErrorMatchingSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can set multiple attribute errors for a single entity", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
          attributes: [
            createAttribute({
              name: "label",
              validate(value) {
                return value;
              },
            }),
            createAttribute({
              name: "title",
              validate(value) {
                return value;
              },
            }),
          ],
        }),
      ],
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              attributes: {},
            },
          },
          root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
        entitiesAttributesErrors: {},
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    expect(
      builderStore.setEntityAttributesErrors(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        {
          label: "some error",
          title: "another error",
        },
      ),
    ).toEqual(undefined);

    expect(builderStore.getData()).toMatchSnapshot();

    expect(() =>
      builderStore.setEntityAttributeError("invalid", "title", "error"),
    ).toThrowErrorMatchingSnapshot();

    expect(() =>
      builderStore.setEntityAttributesErrors(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        {
          // @ts-expect-error Intentional wrong data type
          invalid: "some error",
        },
      ),
    ).toThrowErrorMatchingSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can reset a single entity attribute error", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "select",
          attributes: [
            createAttribute({
              name: "label",
              validate(value) {
                return value;
              },
            }),
            createAttribute({
              name: "title",
              validate(value) {
                return value;
              },
            }),
          ],
        }),
        createEntity({
          name: "text",
          attributes: [
            createAttribute({
              name: "maxLength",
              validate(value) {
                return value;
              },
            }),
          ],
        }),
      ],
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "select",
              attributes: {},
            },
          },
          root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
        entitiesAttributesErrors: {},
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    builderStore.setEntityAttributesErrors(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
      {
        label: "label error",
        title: "title error",
      },
    );

    expect(builderStore.getData()).toMatchSnapshot();

    expect(
      builderStore.resetEntityAttributeError(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "label",
      ),
    ).toEqual(undefined);

    expect(builderStore.getData()).toMatchSnapshot();

    expect(() =>
      builderStore.resetEntityAttributeError("invalid", "title"),
    ).toThrowErrorMatchingSnapshot();

    expect(() =>
      builderStore.resetEntityAttributeError(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        // @ts-expect-error Intentional wrong data type
        "invalid",
      ),
    ).toThrowErrorMatchingSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can reset all attributes errors for a single entity", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
          attributes: [
            createAttribute({
              name: "label",
              validate(value) {
                return value;
              },
            }),
            createAttribute({
              name: "title",
              validate(value) {
                return value;
              },
            }),
          ],
        }),
      ],
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              attributes: {},
            },
          },
          root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
        entitiesAttributesErrors: {},
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    builderStore.setEntityAttributesErrors(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
      {
        label: "label error",
        title: "title error",
      },
    );

    expect(builderStore.getData()).toMatchSnapshot();

    expect(
      builderStore.resetEntityAttributesErrors(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
      ),
    ).toEqual(undefined);

    expect(builderStore.getData()).toMatchSnapshot();

    expect(() =>
      builderStore.resetEntityAttributesErrors("invalid"),
    ).toThrowErrorMatchingSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can reset all attributes errors for all entities", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
          attributes: [
            createAttribute({
              name: "label",
              validate(value) {
                return value;
              },
            }),
            createAttribute({
              name: "title",
              validate(value) {
                return value;
              },
            }),
          ],
        }),
      ],
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              attributes: {},
            },
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              attributes: {},
            },
          },
          root: [
            "6e0035c3-0d4c-445f-a42b-2d971225447c",
            "51324b32-adc3-4d17-a90e-66b5453935bd",
          ],
        },
        entitiesAttributesErrors: {
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            label: "label error",
          },
          "51324b32-adc3-4d17-a90e-66b5453935bd": {
            title: "title error",
          },
        },
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    expect(builderStore.getData()).toMatchSnapshot();

    expect(builderStore.resetEntitiesAttributesErrors()).toEqual(undefined);

    expect(builderStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can set all attributes errors for all entities", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
          attributes: [
            createAttribute({
              name: "label",
              validate(value) {
                return value;
              },
            }),
            createAttribute({
              name: "title",
              validate(value) {
                return value;
              },
            }),
          ],
        }),
      ],
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              attributes: {},
            },
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              attributes: {},
            },
          },
          root: [
            "6e0035c3-0d4c-445f-a42b-2d971225447c",
            "51324b32-adc3-4d17-a90e-66b5453935bd",
          ],
        },
        entitiesAttributesErrors: {},
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    builderStore.setEntitiesAttributesErrors({
      "6e0035c3-0d4c-445f-a42b-2d971225447c": {
        label: "label error",
      },
      "51324b32-adc3-4d17-a90e-66b5453935bd": {
        title: "title error",
      },
    });

    expect(builderStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("applies only the last result of an entity attribute validation", async () => {
    const createDebounceManagerMock = vi.spyOn(
      debounceManagerExports,
      "createDebounceManager",
    );

    let validationNumber = 0;

    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          attributes: [
            createAttribute({
              name: "test",
              async validate() {
                validationNumber++;

                let error = validationNumber;

                if (validationNumber === 1) {
                  error = validationNumber;

                  await new Promise((resolve) => setTimeout(resolve, 200));
                } else {
                  error = validationNumber;

                  await new Promise((resolve) => setTimeout(resolve, 50));
                }

                throw error;

                return validationNumber;
              },
            }),
          ],
        }),
      ],
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        schema: {
          entities: {
            "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
              type: "text",
              attributes: {
                test: 1,
              },
            },
          },
          root: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
        },
        entitiesAttributesErrors: {
          "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
            test: 0,
          },
        },
      },
    });

    expect(createDebounceManagerMock).toHaveBeenCalledOnce();

    const listener = vi.fn();

    builderStore.subscribe(listener);

    await Promise.all([
      builderStore.validateEntitiesAttributes(),
      new Promise<void>((resolve) => {
        // We want to make sure the second validation will get a different lock timestamp.
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout(async () => {
          await builderStore.validateEntitiesAttributes();

          resolve();
        }, 50);
      }),
    ]);

    expect(listener).toMatchSnapshot();
  });

  it("can clone entities", () => {
    const mockUuids = [
      "49ae95d3-84c0-4d0d-b914-66adde839572",
      "55c0940d-7450-4b01-baf8-b84c05ea5cee",
      "38c62f6a-634a-4b94-b0af-9b95e6c1dc82",
      "0a97c57c-7743-403c-8105-a8c09eb5ab52",
      "4fb898fb-7207-4952-8e5e-511953a42e2c",
    ];

    let mockUuidIndex = 0;

    vi.spyOn(uuidExports, "generateUuid").mockImplementation(() => {
      const uuid = mockUuids[mockUuidIndex++];

      if (!uuid) {
        throw new Error("Mock UUID not found");
      }

      return uuid;
    });

    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
          attributes: [
            createAttribute({
              name: "label",
              validate(value) {
                return value;
              },
            }),
          ],
        }),
      ],
      childrenAllowed: { test: true },
    });

    const builderStore = createBuilderStore({
      builder,
      initialData: {
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              attributes: {},
              children: [
                "8f2336ba-d7a2-4e1e-ad13-2c80cf61499b",
                "b5a5a63e-dbfa-485c-bd3c-8dd23b996b7d",
              ],
            },
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              attributes: {},
              children: ["3194bbe0-b2f3-4d5c-b118-3cce0f72ff52"],
            },
            "8f2336ba-d7a2-4e1e-ad13-2c80cf61499b": {
              type: "test",
              attributes: {},
              parentId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
            },
            "b5a5a63e-dbfa-485c-bd3c-8dd23b996b7d": {
              type: "test",
              attributes: {},
              parentId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
            },
            "3194bbe0-b2f3-4d5c-b118-3cce0f72ff52": {
              type: "test",
              attributes: {},
              parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
              children: ["1c2ec3a4-18a8-4785-906e-6465b9b5883b"],
            },
            "1c2ec3a4-18a8-4785-906e-6465b9b5883b": {
              type: "test",
              attributes: {},
              parentId: "3194bbe0-b2f3-4d5c-b118-3cce0f72ff52",
            },
          },
          root: [
            "6e0035c3-0d4c-445f-a42b-2d971225447c",
            "51324b32-adc3-4d17-a90e-66b5453935bd",
          ],
        },
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    builderStore.cloneEntity("6e0035c3-0d4c-445f-a42b-2d971225447c");

    builderStore.cloneEntity("3194bbe0-b2f3-4d5c-b118-3cce0f72ff52");

    expect(() =>
      builderStore.cloneEntity("invalid"),
    ).toThrowErrorMatchingSnapshot();

    expect(builderStore.getData().schema).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });
});
