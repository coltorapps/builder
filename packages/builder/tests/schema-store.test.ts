import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  createBuilder,
  createEntity,
  createInput,
  createSchemaStore,
} from "../src";
import * as schemaExports from "../src/schema";
import * as uuidExports from "../src/uuid";

describe("schema store", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    vi.setSystemTime(new Date(2000, 1, 1, 13));
  });

  afterEach(() => {
    vi.useRealTimers();

    vi.restoreAllMocks();
  });

  it("can be created without a schema", () => {
    const validateSchemaIntegrityMock = vi.spyOn(
      schemaExports,
      "validateSchemaIntegrity",
    );

    const builder = createBuilder({
      entities: [],
    });

    const schemaStore = createSchemaStore({ builder });

    expect(validateSchemaIntegrityMock).toHaveBeenCalledWith(
      {
        entities: {},
        root: [],
      },
      {
        builder,
      },
    );

    expect(schemaStore).toMatchSnapshot();
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

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
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
    });

    expect(validateSchemaIntegrityMock).toMatchSnapshot();

    expect(schemaStore).toMatchSnapshot();
  });

  it("can be created with an empty schema", () => {
    const validateSchemaIntegrityMock = vi.spyOn(
      schemaExports,
      "validateSchemaIntegrity",
    );

    const builder = createBuilder({
      entities: [],
    });

    const schemaStore = createSchemaStore({
      builder,
      serializedData: { entities: {}, root: [] },
    });

    expect(validateSchemaIntegrityMock).toMatchSnapshot();

    expect(schemaStore).toMatchSnapshot();
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

    const schemaStore = createSchemaStore({ builder, serializedData: schema });

    expect(schemaStore.getData()).toMatchSnapshot();

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

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
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
    });

    const listener = vi.fn();

    schemaStore.subscribe(listener);

    schemaStore.setData({
      entities: new Map(),
      root: new Set(),
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

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
        entities: {},
        root: [],
      },
    });

    const listener = vi.fn();

    schemaStore.subscribe(listener);

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

    schemaStore.setSerializedData(schema);

    expect(validateSchemaIntegrityMock).toHaveBeenCalledWith(schema, {
      builder,
    });

    expect(listener).toMatchSnapshot();

    expect(schemaStore.getData()).toMatchSnapshot();
  });

  it("can return the schema", () => {
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

    const schemaStore = createSchemaStore({ builder, serializedData: schema });

    expect(schemaStore.getSerializedData()).toMatchSnapshot();
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

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
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
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    schemaStore.subscribe(listenerWrapper);

    schemaStore.deleteEntity("3dc165dd-88d4-4884-ac8a-5d107d023e54");

    expect(schemaStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("throws when trying to delete non existent entity", () => {
    const builder = createBuilder({ entities: [] });

    expect(() =>
      createSchemaStore({ builder }).deleteEntity("test"),
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

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
        entities: {
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            type: "test",
            inputs: {},
          },
        },
        root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
      },
    });

    expect(() =>
      schemaStore.addEntity({
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

    const schemaStore = createSchemaStore({ builder });

    expect(() =>
      schemaStore.addEntity({
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

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
        entities: {
          "51324b32-adc3-4d17-a90e-66b5453935bd": {
            type: "test",
            inputs: {},
          },
        },
        root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
      },
    });

    expect(() =>
      schemaStore.addEntity({
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

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
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
    });

    expect(() =>
      schemaStore.moveEntityToRoot("6e0035c3-0d4c-445f-a42b-2d971225447c"),
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

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
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
    });

    expect(() =>
      schemaStore.moveEntityToParent(
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

    const schemaStore = createSchemaStore({ builder });

    expect(() =>
      schemaStore.addEntity({
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

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
        entities: {
          "51324b32-adc3-4d17-a90e-66b5453935bd": {
            type: "test",
            inputs: {},
          },
        },
        root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
      },
    });

    schemaStore.addEntity({
      type: "test",
      inputs: {},
    });

    expect(schemaStore.getData()).toMatchSnapshot();
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

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
        entities: {
          "51324b32-adc3-4d17-a90e-66b5453935bd": {
            type: "test",
            inputs: {},
          },
        },
        root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
      },
    });

    schemaStore.addEntity({
      type: "test",
      inputs: {},
      index: 0,
    });

    expect(schemaStore.getData()).toMatchSnapshot();
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

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
        entities: {
          "51324b32-adc3-4d17-a90e-66b5453935bd": {
            type: "test",
            inputs: {},
          },
        },
        root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
      },
    });

    schemaStore.addEntity({
      type: "test",
      inputs: {},
      parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
    });

    expect(schemaStore.getData()).toMatchSnapshot();
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

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
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
    });

    schemaStore.addEntity({
      type: "test",
      inputs: {},
      parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
      index: 0,
    });

    expect(schemaStore.getData()).toMatchSnapshot();
  });

  it("can move an entity in root", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
    });

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
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
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    schemaStore.subscribe(listenerWrapper);

    schemaStore.moveEntityToRoot("6e0035c3-0d4c-445f-a42b-2d971225447c", 0);

    expect(schemaStore.getData()).toMatchSnapshot();

    schemaStore.moveEntityToRoot("6e0035c3-0d4c-445f-a42b-2d971225447c", 1);

    expect(schemaStore.getData()).toMatchSnapshot();

    schemaStore.moveEntityToRoot("6e0035c3-0d4c-445f-a42b-2d971225447c");

    expect(schemaStore.getData()).toMatchSnapshot();

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

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
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
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    schemaStore.subscribe(listenerWrapper);

    schemaStore.moveEntityToRoot("6e0035c3-0d4c-445f-a42b-2d971225447c");

    expect(schemaStore.getData()).toMatchSnapshot();

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

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
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
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    schemaStore.subscribe(listenerWrapper);

    schemaStore.moveEntityToRoot("6e0035c3-0d4c-445f-a42b-2d971225447c", 0);

    expect(schemaStore.getData()).toMatchSnapshot();

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

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
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
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    schemaStore.subscribe(listenerWrapper);

    schemaStore.moveEntityToParent(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
      "51324b32-adc3-4d17-a90e-66b5453935bd",
    );

    expect(schemaStore.getData()).toMatchSnapshot();

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

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
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
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    schemaStore.subscribe(listenerWrapper);

    schemaStore.moveEntityToParent(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
      "51324b32-adc3-4d17-a90e-66b5453935bd",
      0,
    );

    expect(schemaStore.getData()).toMatchSnapshot();

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

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
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
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    schemaStore.subscribe(listenerWrapper);

    schemaStore.moveEntityToParent(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
      "51324b32-adc3-4d17-a90e-66b5453935bd",
      0,
    );

    expect(schemaStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("throws when trying to move a non existent entity", () => {
    const builder = createBuilder({
      entities: [],
    });

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
        entities: {},
        root: [],
      },
    });

    expect(() =>
      schemaStore.moveEntityToParent("invalid", "invalid"),
    ).toThrowErrorMatchingSnapshot();

    expect(() =>
      schemaStore.moveEntityToRoot("invalid"),
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

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
        entities: {
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            type: "test",
            inputs: {},
          },
        },
        root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
      },
    });

    expect(() =>
      schemaStore.moveEntityToParent(
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

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
        entities: {},
        root: [],
      },
    });

    expect(() =>
      schemaStore.addEntity({ type: "test", inputs: {}, parentId: "invalid" }),
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

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
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
    });

    const listener = vi.fn();

    const listenerWrapper = (...args: unknown[]): unknown => listener(args[1]);

    schemaStore.subscribe(listenerWrapper);

    schemaStore.setEntityInput(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
      "label",
      "New label",
    );

    schemaStore.setEntityInput(
      "51324b32-adc3-4d17-a90e-66b5453935bd",
      "maxLength",
      1,
    );

    expect(schemaStore.getData()).toMatchSnapshot();

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

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
        entities: {},
        root: [],
      },
    });

    expect(() =>
      schemaStore.setEntityInput("invalid", "", ""),
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

    const schemaStore = createSchemaStore({
      builder,
      serializedData: {
        entities: {
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            type: "test",
            // @ts-expect-error Intentional wrong data type
            inputs: {},
          },
        },
        root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
      },
    });

    expect(() =>
      schemaStore.setEntityInput(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        // @ts-expect-error Intentional wrong data type
        "invalid",
        "",
      ),
    ).toThrowErrorMatchingSnapshot();
  });
});
