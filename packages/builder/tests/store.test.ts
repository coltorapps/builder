import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createBuilder, createEntity, createInput, createStore } from "../src";
import * as schemaExports from "../src/schema";
import * as uuidExports from "../src/uuid";

describe("store", () => {
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

    const store = createStore(builder);

    expect(validateSchemaIntegrityMock).toHaveBeenCalledWith(
      builder,
      undefined,
    );

    expect(store).toMatchSnapshot();
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

    const store = createStore(builder, {
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
    });

    expect(validateSchemaIntegrityMock).toMatchSnapshot();

    expect(store).toMatchSnapshot();
  });

  it("can be created with an empty schema", () => {
    const validateSchemaIntegrityMock = vi.spyOn(
      schemaExports,
      "validateSchemaIntegrity",
    );

    const builder = createBuilder({
      entities: [],
    });

    const store = createStore(builder, { schema: { entities: {}, root: [] } });

    expect(validateSchemaIntegrityMock).toMatchSnapshot();

    expect(store).toMatchSnapshot();
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

    const store = createStore(builder, { schema });

    expect(store.getData()).toMatchSnapshot();

    expect(validateSchemaIntegrityMock).toHaveBeenCalledWith(builder, schema);
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

    const store = createStore(builder, { schema });

    expect(store.getSerializedSchema()).toMatchSnapshot();
  });

  it("notifies listeners on changes", () => {
    vi.spyOn(uuidExports, "generateUuid").mockImplementation(
      () => "6e0035c3-0d4c-445f-a42b-2d971225447c",
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
      childrenAllowed: {
        text: true,
      },
    });

    const store = createStore(builder, {
      schema: {
        entities: {
          "e16641c9-9bfe-4ad0-bdd7-8f11d581a22f": {
            type: "text",
            inputs: {},
          },
        },
        root: ["e16641c9-9bfe-4ad0-bdd7-8f11d581a22f"],
      },
    });

    const listener = vi.fn();

    store.subscribe(listener);

    store.addEntity({ type: "text", inputs: {} });

    expect(listener).toHaveBeenCalledWith(store.getData());

    store.updateEntity("6e0035c3-0d4c-445f-a42b-2d971225447c", {
      parentId: "e16641c9-9bfe-4ad0-bdd7-8f11d581a22f",
    });

    expect(listener).toHaveBeenCalledWith(store.getData());
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

    const store = createStore(builder, {
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
    });

    store.deleteEntity("3dc165dd-88d4-4884-ac8a-5d107d023e54");

    expect(store.getData()).toMatchSnapshot();
  });

  it("throws when trying to delete non existent entity", () => {
    expect(() =>
      createStore(createBuilder({ entities: [] })).deleteEntity("test"),
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

    const store = createStore(builder, {
      schema: {
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
      store.addEntity({
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

    const store = createStore(builder);

    expect(() =>
      store.addEntity({
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

    const store = createStore(builder, {
      schema: {
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
      store.addEntity(
        {
          type: "test",
          inputs: {},
        },
        {
          parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
        },
      ),
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

    const store = createStore(builder, {
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
    });

    expect(() =>
      store.updateEntity("6e0035c3-0d4c-445f-a42b-2d971225447c", {
        parentId: null,
      }),
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

    const store = createStore(builder, {
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
    });

    expect(() =>
      store.updateEntity("6e0035c3-0d4c-445f-a42b-2d971225447c", {
        parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
      }),
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

    const store = createStore(builder);

    expect(() =>
      store.addEntity({
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

    const store = createStore(builder, {
      schema: {
        entities: {
          "51324b32-adc3-4d17-a90e-66b5453935bd": {
            type: "test",
            inputs: {},
          },
        },
        root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
      },
    });

    store.addEntity({
      type: "test",
      inputs: {},
    });

    expect(store.getData()).toMatchSnapshot();
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

    const store = createStore(builder, {
      schema: {
        entities: {
          "51324b32-adc3-4d17-a90e-66b5453935bd": {
            type: "test",
            inputs: {},
          },
        },
        root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
      },
    });

    store.addEntity(
      {
        type: "test",
        inputs: {},
      },
      {
        index: 0,
      },
    );

    expect(store.getData()).toMatchSnapshot();
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

    const store = createStore(builder, {
      schema: {
        entities: {
          "51324b32-adc3-4d17-a90e-66b5453935bd": {
            type: "test",
            inputs: {},
          },
        },
        root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
      },
    });

    store.addEntity(
      {
        type: "test",
        inputs: {},
      },
      {
        parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
      },
    );

    expect(store.getData()).toMatchSnapshot();
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

    const store = createStore(builder, {
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
    });

    store.addEntity(
      {
        type: "test",
        inputs: {},
      },
      {
        parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
        index: 0,
      },
    );

    expect(store.getData()).toMatchSnapshot();
  });

  it("can move an entity in root", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
    });

    const store = createStore(builder, {
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
    });

    store.updateEntity("6e0035c3-0d4c-445f-a42b-2d971225447c", {
      index: 0,
    });

    expect(store.getData()).toMatchSnapshot();

    store.updateEntity("6e0035c3-0d4c-445f-a42b-2d971225447c", {
      index: 1,
      parentId: null,
    });

    expect(store.getData()).toMatchSnapshot();

    store.updateEntity("6e0035c3-0d4c-445f-a42b-2d971225447c", {
      parentId: null,
    });

    expect(store.getData()).toMatchSnapshot();
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

    const store = createStore(builder, {
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
    });

    store.updateEntity("6e0035c3-0d4c-445f-a42b-2d971225447c", {
      parentId: null,
    });

    expect(store.getData()).toMatchSnapshot();
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

    const store = createStore(builder, {
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
    });

    store.updateEntity("6e0035c3-0d4c-445f-a42b-2d971225447c", {
      parentId: null,
      index: 0,
    });

    expect(store.getData()).toMatchSnapshot();
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

    const store = createStore(builder, {
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
    });

    store.updateEntity("6e0035c3-0d4c-445f-a42b-2d971225447c", {
      parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
    });

    expect(store.getData()).toMatchSnapshot();
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

    const store = createStore(builder, {
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
    });

    store.updateEntity("6e0035c3-0d4c-445f-a42b-2d971225447c", {
      parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
      index: 0,
    });

    expect(store.getData()).toMatchSnapshot();
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

    const store = createStore(builder, {
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
    });

    store.updateEntity("6e0035c3-0d4c-445f-a42b-2d971225447c", {
      index: 0,
    });

    expect(store.getData()).toMatchSnapshot();
  });

  it("doesn't update the entity when no mutation fields were provided", () => {
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

    const store = createStore(builder, {
      schema: {
        entities: {
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            type: "test",
            inputs: {},
          },
        },
        root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
      },
    });

    store.updateEntity("6e0035c3-0d4c-445f-a42b-2d971225447c", {});

    expect(store.getData()).toMatchSnapshot();
  });

  it("throws when trying to update a non existent entity", () => {
    const builder = createBuilder({
      entities: [],
    });

    const store = createStore(builder, {
      schema: {
        entities: {},
        root: [],
      },
    });

    expect(() =>
      store.updateEntity("invalid", {}),
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

    const store = createStore(builder, {
      schema: {
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
      store.updateEntity("6e0035c3-0d4c-445f-a42b-2d971225447c", {
        parentId: "invalid",
      }),
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

    const store = createStore(builder, {
      schema: {
        entities: {},
        root: [],
      },
    });

    expect(() =>
      store.addEntity(
        { type: "test", inputs: {} },
        {
          parentId: "invalid",
        },
      ),
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

    const store = createStore(builder, {
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
    });

    store.setEntityInput(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
      "label",
      "New label",
    );

    store.setEntityInput(
      "51324b32-adc3-4d17-a90e-66b5453935bd",
      "maxLength",
      1,
    );

    expect(store.getData()).toMatchSnapshot();
  });

  it("throws when updating an input of a non-existent entity", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
    });

    const store = createStore(builder, {
      schema: {
        entities: {},
        root: [],
      },
    });

    expect(() =>
      store.setEntityInput("invalid", "", ""),
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

    const store = createStore(builder, {
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
    });

    expect(() =>
      store.setEntityInput(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        // @ts-expect-error Intentional wrong data type
        "invalid",
        "",
      ),
    ).toThrowErrorMatchingSnapshot();
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

    const store = createStore(builder, {
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
    });

    await expect(
      store.validateEntityInput(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "label",
      ),
    ).resolves.toEqual(undefined);

    await expect(
      store.validateEntityInput(
        "51324b32-adc3-4d17-a90e-66b5453935bd",
        "label",
      ),
    ).resolves.toEqual(undefined);

    expect(store.getData().entitiesInputsErrors).toMatchSnapshot();

    await expect(
      store.validateEntityInput("invalid", "label"),
    ).rejects.toThrowErrorMatchingSnapshot();

    await expect(
      store.validateEntityInput(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        // @ts-expect-error Intentional wrong data type
        "invalid",
      ),
    ).rejects.toThrowErrorMatchingSnapshot();
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

    const store = createStore(builder, {
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
    });

    await expect(
      store.validateEntityInputs("6e0035c3-0d4c-445f-a42b-2d971225447c"),
    ).resolves.toMatchSnapshot();

    expect(store.getData().entitiesInputsErrors).toMatchSnapshot();

    await expect(
      store.validateEntityInputs("invalid"),
    ).rejects.toThrowErrorMatchingSnapshot();
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

    const store = createStore(builder, {
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
    });

    await expect(store.validateEntitiesInputs()).resolves.toMatchSnapshot();

    expect(store.getData().entitiesInputsErrors).toMatchSnapshot();
  });

  it("can set the active entity ID", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
          inputs: [],
        }),
      ],
    });

    const store = createStore(builder, {
      schema: {
        entities: {
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            type: "test",
            inputs: {},
          },
        },
        root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
      },
    });

    expect(store.getData().activeEntityId).toEqual(null);

    expect(
      store.setActiveEntityId("6e0035c3-0d4c-445f-a42b-2d971225447c"),
    ).toEqual(undefined);

    expect(store.getData().activeEntityId).toEqual(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
    );

    store.setActiveEntityId(null);

    expect(store.getData().activeEntityId).toEqual(null);

    expect(() =>
      store.setActiveEntityId("invalid"),
    ).toThrowErrorMatchingSnapshot();

    store.setActiveEntityId("6e0035c3-0d4c-445f-a42b-2d971225447c");

    store.deleteEntity("6e0035c3-0d4c-445f-a42b-2d971225447c");

    expect(store.getData().activeEntityId).toEqual(null);
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

    const store = createStore(builder, {
      schema: {
        entities: {
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            type: "test",
            inputs: {},
          },
        },
        root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
      },
    });

    expect(
      store.setEntityInputError(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "label",
        "Some error",
      ),
    ).toEqual(undefined);

    expect(
      store.setEntityInputError(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "title",
        "Title error",
      ),
    ).toEqual(undefined);

    expect(store.getData().entitiesInputsErrors).toMatchSnapshot();

    expect(() =>
      store.setEntityInputError("invalid", "title", "error"),
    ).toThrowErrorMatchingSnapshot();

    expect(() =>
      store.setEntityInputError(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        // @ts-expect-error Intentional wrong data type
        "invalid",
        "error",
      ),
    ).toThrowErrorMatchingSnapshot();
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

    const store = createStore(builder, {
      schema: {
        entities: {
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            type: "test",
            inputs: {},
          },
        },
        root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
      },
    });

    expect(
      store.setEntityInputsErrors("6e0035c3-0d4c-445f-a42b-2d971225447c", {
        label: "some error",
        title: "another error",
      }),
    ).toEqual(undefined);

    expect(store.getData().entitiesInputsErrors).toMatchSnapshot();

    expect(() =>
      store.setEntityInputError("invalid", "title", "error"),
    ).toThrowErrorMatchingSnapshot();

    expect(() =>
      store.setEntityInputsErrors("6e0035c3-0d4c-445f-a42b-2d971225447c", {
        // @ts-expect-error Intentional wrong data type
        invalid: "some error",
      }),
    ).toThrowErrorMatchingSnapshot();
  });

  it("can set inputs errors for a all entities", () => {
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

    const store = createStore(builder, {
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
    });

    expect(
      store.setEntitiesInputsErrors({
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          label: "some error",
          title: "another error",
        },
        "51324b32-adc3-4d17-a90e-66b5453935bd": {
          label: "some error",
          title: "another error",
        },
      }),
    ).toEqual(undefined);

    expect(store.getData().entitiesInputsErrors).toMatchSnapshot();

    expect(() =>
      store.setEntitiesInputsErrors({
        invalid: {},
      }),
    ).toThrowErrorMatchingSnapshot();

    expect(() =>
      store.setEntitiesInputsErrors({
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          // @ts-expect-error Intentional wrong data type
          invalid: "some error",
        },
      }),
    ).toThrowErrorMatchingSnapshot();

    store.setEntitiesInputsErrors({});

    expect(store.getData().entitiesInputsErrors).toMatchSnapshot();
  });

  it("can set a reset a single entity input error", () => {
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

    const store = createStore(builder, {
      schema: {
        entities: {
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            type: "select",
            inputs: {},
          },
        },
        root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
      },
    });

    store.setEntityInputsErrors("6e0035c3-0d4c-445f-a42b-2d971225447c", {
      label: "label error",
      title: "title error",
    });

    expect(store.getData().entitiesInputsErrors).toMatchSnapshot();

    expect(
      store.resetEntityInputError(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "label",
      ),
    ).toEqual(undefined);

    expect(store.getData().entitiesInputsErrors).toMatchSnapshot();

    expect(() =>
      store.resetEntityInputError("invalid", "title"),
    ).toThrowErrorMatchingSnapshot();

    expect(() =>
      store.resetEntityInputError(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        // @ts-expect-error Intentional wrong data type
        "invalid",
      ),
    ).toThrowErrorMatchingSnapshot();
  });

  it("can set a reset all inputs errors for a single entity", () => {
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

    const store = createStore(builder, {
      schema: {
        entities: {
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            type: "test",
            inputs: {},
          },
        },
        root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
      },
    });

    store.setEntityInputsErrors("6e0035c3-0d4c-445f-a42b-2d971225447c", {
      label: "label error",
      title: "title error",
    });

    expect(store.getData().entitiesInputsErrors).toMatchSnapshot();

    expect(
      store.resetEntityInputsErrors("6e0035c3-0d4c-445f-a42b-2d971225447c"),
    ).toEqual(undefined);

    expect(store.getData().entitiesInputsErrors).toMatchSnapshot();

    expect(() =>
      store.resetEntityInputsErrors("invalid"),
    ).toThrowErrorMatchingSnapshot();
  });

  it("can set a reset all inputs errors for a all entities", () => {
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

    const store = createStore(builder, {
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
    });

    store.setEntitiesInputsErrors({
      "6e0035c3-0d4c-445f-a42b-2d971225447c": {
        label: "label error",
      },
      "51324b32-adc3-4d17-a90e-66b5453935bd": {
        title: "title error",
      },
    });

    expect(store.getData().entitiesInputsErrors).toMatchSnapshot();

    expect(store.resetEntitiesInputsErrors()).toEqual(undefined);

    expect(store.getData().entitiesInputsErrors).toMatchSnapshot();
  });
});

describe("store events system", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    vi.setSystemTime(new Date(2000, 1, 1, 13));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("dispatches events to listeners on mutations", () => {
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

    const store = createStore(builder, {
      schema: {
        entities: {
          "51324b32-adc3-4d17-a90e-66b5453935bd": {
            type: "test",
            inputs: {},
          },
        },
        root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
      },
    });

    const listener = vi.fn();

    store.subscribeToEvents(listener);

    store.addEntity({ type: "test", inputs: {} });

    store.updateEntity("6e0035c3-0d4c-445f-a42b-2d971225447c", {
      parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
    });

    store.deleteEntity("51324b32-adc3-4d17-a90e-66b5453935bd");

    expect(listener).toMatchSnapshot();
  });
});
