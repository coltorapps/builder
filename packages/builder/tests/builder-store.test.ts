import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  createBuilder,
  createBuilderStore,
  createEntity,
  createInput,
} from "../src";
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
      {
        builder,
      },
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
          inputs: [
            createInput({
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
      serializedData: {
        entitiesInputsErrors: {},
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "text",
              inputs: {
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
      serializedData: {
        entitiesInputsErrors: {},
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
          inputs: [
            createInput({
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
          inputs: {
            label: "test",
          },
        },
      },
      root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
    } as const;

    const builderStore = createBuilderStore({
      builder,
      serializedData: {
        entitiesInputsErrors: {
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            label: "Some error",
          },
        },
        schema,
      },
    });

    expect(builderStore.getData()).toMatchSnapshot();

    expect(validateSchemaIntegrityMock).toHaveBeenCalledWith(schema, {
      builder,
    });
  });

  it("can set the data", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          inputs: [
            createInput({
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
      serializedData: {
        entitiesInputsErrors: {
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            label: "some error",
          },
        },
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "text",
              inputs: {
                label: "test",
              },
            },
          },
          root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
      },
    });

    const listener = vi.fn();

    builderStore.subscribe(listener);

    builderStore.setData({
      entitiesInputsErrors: new Map(),
      schema: {
        entities: new Map(),
        root: new Set(),
      },
    });

    expect(listener).toMatchSnapshot();
  });

  it("can set raw data", () => {
    const validateSchemaIntegrityMock = vi.spyOn(
      schemaExports,
      "validateSchemaIntegrity",
    );

    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          inputs: [
            createInput({
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
      serializedData: {
        entitiesInputsErrors: {},
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
          inputs: {
            label: "test",
          },
        },
      },
      root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
    } as const;

    builderStore.setSerializedData({
      schema,
      entitiesInputsErrors: {
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          label: "some error",
        },
      },
    });

    expect(validateSchemaIntegrityMock).toHaveBeenCalledWith(schema, {
      builder,
    });

    expect(listener).toMatchSnapshot();

    expect(builderStore.getData()).toMatchSnapshot();
  });

  it("can return the data", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          inputs: [
            createInput({
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
          inputs: {
            label: "test",
          },
        },
      },
      root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
    } as const;

    const builderStore = createBuilderStore({
      builder,
      serializedData: {
        entitiesInputsErrors: {
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            label: "some error",
          },
        },
        schema,
      },
    });

    expect(builderStore.getSerializedData()).toMatchSnapshot();
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
      serializedData: {
        entitiesInputsErrors: {
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {},
          "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {},
          "3dc165dd-88d4-4884-ac8a-5d107d023e54": {},
          "49e91328-02bc-4daa-ab56-619554e85cff": {},
        },
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              inputs: {},
              parentId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
            },
            "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
              type: "test",
              inputs: {},
              children: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
              parentId: "3dc165dd-88d4-4884-ac8a-5d107d023e54",
            },
            "3dc165dd-88d4-4884-ac8a-5d107d023e54": {
              type: "test",
              inputs: {},
              children: ["c1ab14a4-41db-4531-9a58-4825a9ef6d26"],
            },
            "49e91328-02bc-4daa-ab56-619554e85cff": {
              type: "test",
              inputs: {},
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
      serializedData: {
        entitiesInputsErrors: {},
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              inputs: {},
            },
          },
          root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
      },
    });

    expect(() =>
      builderStore.addEntity({
        type: "test",
        inputs: {},
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
        inputs: {},
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
      serializedData: {
        entitiesInputsErrors: {},
        schema: {
          entities: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              inputs: {},
            },
          },
          root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
        },
      },
    });

    expect(() =>
      builderStore.addEntity({
        type: "test",
        inputs: {},
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
      serializedData: {
        entitiesInputsErrors: {},
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "text",
              inputs: {},
              parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
            },
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "section",
              inputs: {},
              children: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
            },
          },
          root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
        },
      },
    });

    expect(() =>
      builderStore.removeEntityParentId("6e0035c3-0d4c-445f-a42b-2d971225447c"),
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
      serializedData: {
        entitiesInputsErrors: {},
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              inputs: {},
            },
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              inputs: {},
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
      builderStore.setEntityParentId(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "51324b32-adc3-4d17-a90e-66b5453935bd",
      ),
    ).toThrowErrorMatchingSnapshot();
  });

  it("throws when adding an entity with a non-existent input", () => {
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
        inputs: {
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
      serializedData: {
        entitiesInputsErrors: {},
        schema: {
          entities: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              inputs: {},
            },
          },
          root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
        },
      },
    });

    builderStore.addEntity({
      type: "test",
      inputs: {},
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
      serializedData: {
        entitiesInputsErrors: {},
        schema: {
          entities: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              inputs: {},
            },
          },
          root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
        },
      },
    });

    builderStore.addEntity({
      type: "test",
      inputs: {},
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
      serializedData: {
        entitiesInputsErrors: {},
        schema: {
          entities: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              inputs: {},
            },
          },
          root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
        },
      },
    });

    builderStore.addEntity({
      type: "test",
      inputs: {},
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
      serializedData: {
        entitiesInputsErrors: {},
        schema: {
          entities: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              inputs: {},
              children: ["a02cd91c-d982-4e80-8fa4-184e9fe2b0b5"],
            },
            "a02cd91c-d982-4e80-8fa4-184e9fe2b0b5": {
              type: "test",
              inputs: {},
              parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
            },
          },
          root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
        },
      },
    });

    builderStore.addEntity({
      type: "test",
      inputs: {},
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
      serializedData: {
        entitiesInputsErrors: {},
        schema: {
          entities: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              inputs: {},
            },
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              inputs: {},
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

    builderStore.removeEntityParentId(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
      0,
    );

    expect(builderStore.getData()).toMatchSnapshot();

    builderStore.removeEntityParentId(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
      1,
    );

    expect(builderStore.getData()).toMatchSnapshot();

    builderStore.removeEntityParentId("6e0035c3-0d4c-445f-a42b-2d971225447c");

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
      serializedData: {
        entitiesInputsErrors: {},
        schema: {
          entities: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              inputs: {},
              children: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
            },
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              inputs: {},
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

    builderStore.removeEntityParentId("6e0035c3-0d4c-445f-a42b-2d971225447c");

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
      serializedData: {
        entitiesInputsErrors: {},
        schema: {
          entities: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              inputs: {},
              children: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
            },
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              inputs: {},
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

    builderStore.removeEntityParentId(
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
      serializedData: {
        entitiesInputsErrors: {},
        schema: {
          entities: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              inputs: {},
              children: ["a02cd91c-d982-4e80-8fa4-184e9fe2b0b5"],
            },
            "a02cd91c-d982-4e80-8fa4-184e9fe2b0b5": {
              type: "test",
              inputs: {},
              parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
            },
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              inputs: {},
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

    builderStore.setEntityParentId(
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
      serializedData: {
        entitiesInputsErrors: {},
        schema: {
          entities: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              inputs: {},
              children: ["a02cd91c-d982-4e80-8fa4-184e9fe2b0b5"],
            },
            "a02cd91c-d982-4e80-8fa4-184e9fe2b0b5": {
              type: "test",
              inputs: {},
              parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
            },
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              inputs: {},
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

    builderStore.setEntityParentId(
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
      serializedData: {
        entitiesInputsErrors: {},
        schema: {
          entities: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              inputs: {},
              children: [
                "a02cd91c-d982-4e80-8fa4-184e9fe2b0b5",
                "6e0035c3-0d4c-445f-a42b-2d971225447c",
              ],
            },
            "a02cd91c-d982-4e80-8fa4-184e9fe2b0b5": {
              type: "test",
              inputs: {},
              parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
            },
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              inputs: {},
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

    builderStore.setEntityParentId(
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
      serializedData: {
        entitiesInputsErrors: {},
        schema: {
          entities: {},
          root: [],
        },
      },
    });

    expect(() =>
      builderStore.setEntityParentId("invalid", "invalid"),
    ).toThrowErrorMatchingSnapshot();

    expect(() =>
      builderStore.removeEntityParentId("invalid"),
    ).toThrowErrorMatchingSnapshot();
  });

  it("throws when trying to move an entity to a non existent parent entity", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
    });

    const builderStore = createBuilderStore({
      builder,
      serializedData: {
        entitiesInputsErrors: {},
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              inputs: {},
            },
          },
          root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
      },
    });

    expect(() =>
      builderStore.setEntityParentId(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "invalid",
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
      serializedData: {
        entitiesInputsErrors: {},
        schema: {
          entities: {},
          root: [],
        },
      },
    });

    expect(() =>
      builderStore.addEntity({ type: "test", inputs: {}, parentId: "invalid" }),
    ).toThrowErrorMatchingSnapshot();
  });

  it("can update entity inputs", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "select",
          inputs: [
            createInput({
              name: "label",
              validate(value) {
                return z.string().parse(value);
              },
            }),
            createInput({
              name: "required",
              validate(value) {
                return z.boolean().parse(value);
              },
            }),
          ],
        }),
        createEntity({
          name: "text",
          inputs: [
            createInput({
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
      serializedData: {
        entitiesInputsErrors: {},
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "select",
              inputs: {
                label: "Old label",
                required: true,
              },
            },
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "text",
              inputs: {
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

    builderStore.setEntityInput(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
      "label",
      "New label",
    );

    builderStore.setEntityInput(
      "51324b32-adc3-4d17-a90e-66b5453935bd",
      "maxLength",
      1,
    );

    expect(builderStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("throws when updating an input of a non-existent entity", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
    });

    const builderStore = createBuilderStore({
      builder,
      serializedData: {
        entitiesInputsErrors: {},
        schema: {
          entities: {},
          root: [],
        },
      },
    });

    expect(() =>
      builderStore.setEntityInput("invalid", "", ""),
    ).toThrowErrorMatchingSnapshot();
  });

  it("throws when updating an non-existent input of an entity", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
          inputs: [
            createInput({
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
      serializedData: {
        entitiesInputsErrors: {},
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              // @ts-expect-error Intentional wrong data type
              inputs: {},
            },
          },
          root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
      },
    });

    expect(() =>
      builderStore.setEntityInput(
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
      serializedData: {
        entitiesInputsErrors: {},
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              inputs: {},
            },
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              inputs: {},
              children: [
                "eedf598e-1422-469a-acb1-b2d8bfabb0f3",
                "7c3cf1e5-c35d-49c0-80ca-e8000ac8095e",
              ],
            },
            "eedf598e-1422-469a-acb1-b2d8bfabb0f3": {
              type: "test",
              inputs: {},
              parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
            },
            "7c3cf1e5-c35d-49c0-80ca-e8000ac8095e": {
              type: "test",
              inputs: {},
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

  it("can validate a single entity input", async () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
          inputs: [
            createInput({
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
      serializedData: {
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              inputs: {
                // @ts-expect-error Intentional wrong data type
                label: 1,
              },
            },
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              // @ts-expect-error Intentional wrong data type
              inputs: {},
            },
          },
          root: [
            "6e0035c3-0d4c-445f-a42b-2d971225447c",
            "51324b32-adc3-4d17-a90e-66b5453935bd",
          ],
        },
        entitiesInputsErrors: {},
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    await expect(
      builderStore.validateEntityInput(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "label",
      ),
    ).resolves.toEqual(undefined);

    await expect(
      builderStore.validateEntityInput(
        "51324b32-adc3-4d17-a90e-66b5453935bd",
        "label",
      ),
    ).resolves.toEqual(undefined);

    expect(builderStore.getData()).toMatchSnapshot();

    await expect(
      builderStore.validateEntityInput("invalid", "label"),
    ).rejects.toThrowErrorMatchingSnapshot();

    await expect(
      builderStore.validateEntityInput(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        // @ts-expect-error Intentional wrong data type
        "invalid",
      ),
    ).rejects.toThrowErrorMatchingSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can validate a all inputs of a single entity", async () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
          inputs: [
            createInput({
              name: "label",
              validate(value) {
                return z.string().parse(value);
              },
            }),
            createInput({
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
      serializedData: {
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              inputs: {
                // @ts-expect-error Intentional wrong data type
                label: 1,
                // @ts-expect-error Intentional wrong data type
                maxLength: "1",
              },
            },
          },
          root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
        entitiesInputsErrors: {},
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    await builderStore.validateEntityInputs(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
    );

    expect(builderStore.getData()).toMatchSnapshot();

    await expect(
      builderStore.validateEntityInputs("invalid"),
    ).rejects.toThrowErrorMatchingSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can validate a all inputs of all entities", async () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
          inputs: [
            createInput({
              name: "label",
              validate(value) {
                return z.string().parse(value);
              },
            }),
            createInput({
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
      serializedData: {
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              inputs: {
                // @ts-expect-error Intentional wrong data type
                label: 1,
                maxLength: 1,
              },
            },
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              inputs: {
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
        entitiesInputsErrors: {},
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    await builderStore.validateEntitiesInputs();

    expect(builderStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can set a single entity input error", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
          inputs: [
            createInput({
              name: "label",
              validate(value) {
                return value;
              },
            }),
            createInput({
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
      serializedData: {
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              inputs: {},
            },
          },
          root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
        entitiesInputsErrors: {},
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    expect(
      builderStore.setEntityInputError(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "label",
        "Some error",
      ),
    ).toEqual(undefined);

    expect(
      builderStore.setEntityInputError(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "title",
        "Title error",
      ),
    ).toEqual(undefined);

    expect(builderStore.getData()).toMatchSnapshot();

    expect(() =>
      builderStore.setEntityInputError("invalid", "title", "error"),
    ).toThrowErrorMatchingSnapshot();

    expect(() =>
      builderStore.setEntityInputError(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        // @ts-expect-error Intentional wrong data type
        "invalid",
        "error",
      ),
    ).toThrowErrorMatchingSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can set multiple input errors for a single entity", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
          inputs: [
            createInput({
              name: "label",
              validate(value) {
                return value;
              },
            }),
            createInput({
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
      serializedData: {
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              inputs: {},
            },
          },
          root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
        entitiesInputsErrors: {},
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    expect(
      builderStore.setEntityInputsErrors(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        {
          label: "some error",
          title: "another error",
        },
      ),
    ).toEqual(undefined);

    expect(builderStore.getData()).toMatchSnapshot();

    expect(() =>
      builderStore.setEntityInputError("invalid", "title", "error"),
    ).toThrowErrorMatchingSnapshot();

    expect(() =>
      builderStore.setEntityInputsErrors(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        {
          // @ts-expect-error Intentional wrong data type
          invalid: "some error",
        },
      ),
    ).toThrowErrorMatchingSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can reset a single entity input error", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "select",
          inputs: [
            createInput({
              name: "label",
              validate(value) {
                return value;
              },
            }),
            createInput({
              name: "title",
              validate(value) {
                return value;
              },
            }),
          ],
        }),
        createEntity({
          name: "text",
          inputs: [
            createInput({
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
      serializedData: {
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "select",
              inputs: {},
            },
          },
          root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
        entitiesInputsErrors: {},
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    builderStore.setEntityInputsErrors("6e0035c3-0d4c-445f-a42b-2d971225447c", {
      label: "label error",
      title: "title error",
    });

    expect(builderStore.getData()).toMatchSnapshot();

    expect(
      builderStore.resetEntityInputError(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "label",
      ),
    ).toEqual(undefined);

    expect(builderStore.getData()).toMatchSnapshot();

    expect(() =>
      builderStore.resetEntityInputError("invalid", "title"),
    ).toThrowErrorMatchingSnapshot();

    expect(() =>
      builderStore.resetEntityInputError(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        // @ts-expect-error Intentional wrong data type
        "invalid",
      ),
    ).toThrowErrorMatchingSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can reset all inputs errors for a single entity", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
          inputs: [
            createInput({
              name: "label",
              validate(value) {
                return value;
              },
            }),
            createInput({
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
      serializedData: {
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              inputs: {},
            },
          },
          root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
        entitiesInputsErrors: {},
      },
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    builderStore.subscribe(listenerWrapper);

    builderStore.setEntityInputsErrors("6e0035c3-0d4c-445f-a42b-2d971225447c", {
      label: "label error",
      title: "title error",
    });

    expect(builderStore.getData()).toMatchSnapshot();

    expect(
      builderStore.resetEntityInputsErrors(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
      ),
    ).toEqual(undefined);

    expect(builderStore.getData()).toMatchSnapshot();

    expect(() =>
      builderStore.resetEntityInputsErrors("invalid"),
    ).toThrowErrorMatchingSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can reset all inputs errors for all entities", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
          inputs: [
            createInput({
              name: "label",
              validate(value) {
                return value;
              },
            }),
            createInput({
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
      serializedData: {
        schema: {
          entities: {
            "6e0035c3-0d4c-445f-a42b-2d971225447c": {
              type: "test",
              inputs: {},
            },
            "51324b32-adc3-4d17-a90e-66b5453935bd": {
              type: "test",
              inputs: {},
            },
          },
          root: [
            "6e0035c3-0d4c-445f-a42b-2d971225447c",
            "51324b32-adc3-4d17-a90e-66b5453935bd",
          ],
        },
        entitiesInputsErrors: {
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

    expect(builderStore.resetEntitiesInputsErrors()).toEqual(undefined);

    expect(builderStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });
});
