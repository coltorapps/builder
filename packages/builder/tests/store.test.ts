import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createBuilder, createEntity, createInput, createStore } from "../src";
import * as schemaExports from "../src/schema";
import * as uuidExports from "../src/uuid";

describe("store", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("can be created without a schema", () => {
    const baseValidateSchemaMock = vi.spyOn(
      schemaExports,
      "baseValidateSchema",
    );

    const builder = createBuilder({
      entities: [],
    });

    const store = createStore(builder);

    expect(baseValidateSchemaMock).toHaveBeenCalledWith(builder, undefined);

    expect(store).toMatchSnapshot();
  });

  it("can be created with a non-empty schema", () => {
    const baseValidateSchemaMock = vi.spyOn(
      schemaExports,
      "baseValidateSchema",
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
      entities: {
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "text",
          inputs: {
            label: "test",
          },
        },
      },
      root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
    });

    expect(baseValidateSchemaMock).toMatchSnapshot();

    expect(store).toMatchSnapshot();
  });

  it("can be created with an empty schema", () => {
    const baseValidateSchemaMock = vi.spyOn(
      schemaExports,
      "baseValidateSchema",
    );

    const builder = createBuilder({
      entities: [],
    });

    const store = createStore(builder, { entities: {}, root: [] });

    expect(baseValidateSchemaMock).toMatchSnapshot();

    expect(store).toMatchSnapshot();
  });

  it("can retrieve the data", () => {
    const baseValidateSchemaMock = vi.spyOn(
      schemaExports,
      "baseValidateSchema",
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

    const store = createStore(builder, schema);

    expect(store.getData()).toMatchSnapshot();

    expect(baseValidateSchemaMock).toHaveBeenCalledWith(builder, schema);
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

    const store = createStore(builder, schema);

    const baseValidateSchemaMock = vi.spyOn(
      schemaExports,
      "baseValidateSchema",
    );

    expect(store.getSchema()).toMatchSnapshot();

    expect(baseValidateSchemaMock).toHaveBeenCalledWith(builder, schema);
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
      entities: {
        "e16641c9-9bfe-4ad0-bdd7-8f11d581a22f": {
          type: "text",
          inputs: {},
        },
      },
      root: ["e16641c9-9bfe-4ad0-bdd7-8f11d581a22f"],
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
    });

    store.deleteEntity("3dc165dd-88d4-4884-ac8a-5d107d023e54");

    expect(store.getData()).toMatchSnapshot();
  });

  it("throws when trying to delete non existent entity", () => {
    expect(() =>
      createStore(createBuilder({ entities: [] })).deleteEntity("test"),
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
      entities: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": {
          type: "test",
          inputs: {},
        },
      },
      root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
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
      entities: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": {
          type: "test",
          inputs: {},
        },
      },
      root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
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
      entities: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": {
          type: "test",
          inputs: {},
        },
      },
      root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
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
      entities: {
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "test",
          inputs: {},
        },
      },
      root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
    });

    store.updateEntity("6e0035c3-0d4c-445f-a42b-2d971225447c", {});

    expect(store.getData()).toMatchSnapshot();
  });

  it("throws when trying to update a non existent entity", () => {
    const builder = createBuilder({
      entities: [],
    });

    const store = createStore(builder, {
      entities: {},
      root: [],
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
      entities: {
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "test",
          inputs: {},
        },
      },
      root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
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
      entities: {},
      root: [],
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
      entities: {
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "test",
          inputs: {
            label: "Old label",
          },
        },
      },
      root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
    });

    store.updateEntityInput(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
      "label",
      "New label",
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
      entities: {},
      root: [],
    });

    expect(() =>
      store.updateEntityInput("invalid", "", ""),
    ).toThrowErrorMatchingSnapshot();
  });

  it("throws when updating an non-existent input of an entity", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
        }),
      ],
    });

    const store = createStore(builder, {
      entities: {
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "test",
          inputs: {},
        },
      },
      root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
    });

    expect(() =>
      store.updateEntityInput(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "invalid",
        "",
      ),
    ).toThrowErrorMatchingSnapshot();
  });
});
