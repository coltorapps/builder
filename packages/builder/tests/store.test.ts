import { afterEach, describe, expect, it, vi } from "vitest";

import { createBuilder, createEntity, createInput, createStore } from "../src";
import * as schemaExports from "../src/schema";
import { upsertEntity } from "../src/store";
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

  it("can notifies listeners on changes", () => {
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

    store.updateEntity("6e0035c3-0d4c-445f-a42b-2d971225447c", {
      parentId: "e16641c9-9bfe-4ad0-bdd7-8f11d581a22f",
    });

    expect(listener).toMatchSnapshot();
  });

  it("can delete entities and cascade delete their children", () => {
    const baseValidateSchemaMock = vi.spyOn(
      schemaExports,
      "baseValidateSchema",
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

    expect(store.getSchema()).toMatchSnapshot();

    expect(baseValidateSchemaMock).toHaveBeenCalledWith(builder, {
      entities: {
        "49e91328-02bc-4daa-ab56-619554e85cff": {
          type: "test",
          inputs: {},
          children: [],
        },
      },
      root: ["49e91328-02bc-4daa-ab56-619554e85cff"],
    });
  });

  it("throws when trying to delete non existent entity", () => {
    expect(() =>
      createStore(createBuilder({ entities: [] })).deleteEntity("test"),
    ).toThrowErrorMatchingSnapshot();
  });
});

describe("entity upsertion", () => {
  it("can insert new entities into empty schemas", () => {
    expect(
      upsertEntity(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        {
          type: "text",
          inputs: {},
        },
        {},
        {
          data: {
            entities: new Map(),
            root: new Set(),
          },
          builder: createBuilder({
            entities: [createEntity({ name: "text" })],
          }),
        },
      ),
    ).toMatchSnapshot();
  });

  it("can insert new entities into non-empty schemas", () => {
    expect(
      upsertEntity(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        {
          type: "text",
          inputs: {},
        },
        {},
        {
          data: {
            entities: new Map([
              [
                "4c3dc13d-d179-4a03-b4b6-596bad1625d0",
                { inputs: {}, type: "text" },
              ],
            ]),
            root: new Set(["4c3dc13d-d179-4a03-b4b6-596bad1625d0"]),
          },
          builder: createBuilder({
            entities: [createEntity({ name: "text" })],
          }),
        },
      ),
    ).toMatchSnapshot();
  });

  it("insert new entities with parent ID provided as NULL into non-empty schemas", () => {
    expect(
      upsertEntity(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        {
          type: "text",
          inputs: {},
        },
        {
          parentId: null,
        },
        {
          data: {
            entities: new Map([
              [
                "4c3dc13d-d179-4a03-b4b6-596bad1625d0",
                { inputs: {}, type: "text" },
              ],
            ]),
            root: new Set(["4c3dc13d-d179-4a03-b4b6-596bad1625d0"]),
          },
          builder: createBuilder({
            entities: [createEntity({ name: "text" })],
          }),
        },
      ),
    ).toMatchSnapshot();
  });

  it("can insert new entities with index into non-empty schemas", () => {
    expect(
      upsertEntity(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        {
          type: "text",
          inputs: {},
        },
        {
          index: 0,
        },
        {
          data: {
            entities: new Map([
              [
                "4c3dc13d-d179-4a03-b4b6-596bad1625d0",
                { inputs: {}, type: "text" },
              ],
            ]),
            root: new Set(["4c3dc13d-d179-4a03-b4b6-596bad1625d0"]),
          },
          builder: createBuilder({
            entities: [createEntity({ name: "text" })],
          }),
        },
      ),
    ).toMatchSnapshot();
  });

  it("can insert new entities with parent ID into non-empty schemas", () => {
    expect(
      upsertEntity(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        {
          type: "text",
          inputs: {},
        },
        {
          parentId: "4c3dc13d-d179-4a03-b4b6-596bad1625d0",
        },
        {
          data: {
            entities: new Map([
              [
                "4c3dc13d-d179-4a03-b4b6-596bad1625d0",
                { inputs: {}, type: "text" },
              ],
            ]),
            root: new Set(["4c3dc13d-d179-4a03-b4b6-596bad1625d0"]),
          },
          builder: createBuilder({
            entities: [createEntity({ name: "text" })],
            childrenAllowed: {
              text: true,
            },
          }),
        },
      ),
    ).toMatchSnapshot();
  });

  it("can insert new entities with parent ID and index into non-empty schemas", () => {
    expect(
      upsertEntity(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        {
          type: "text",
          inputs: {},
        },
        {
          parentId: "4c3dc13d-d179-4a03-b4b6-596bad1625d0",
          index: 0,
        },
        {
          data: {
            entities: new Map([
              [
                "4c3dc13d-d179-4a03-b4b6-596bad1625d0",
                {
                  inputs: {},
                  type: "text",
                  children: new Set(["3f9e1fce-8d5b-4888-9600-016f8ec3c9b6"]),
                },
              ],
              [
                "3f9e1fce-8d5b-4888-9600-016f8ec3c9b6",
                {
                  inputs: {},
                  type: "text",
                  parentId: "4c3dc13d-d179-4a03-b4b6-596bad1625d0",
                },
              ],
            ]),
            root: new Set(["4c3dc13d-d179-4a03-b4b6-596bad1625d0"]),
          },
          builder: createBuilder({
            entities: [createEntity({ name: "text" })],
            childrenAllowed: {
              text: true,
            },
          }),
        },
      ),
    ).toMatchSnapshot();
  });

  it("throws when inserting new entities with invalid parent id", () => {
    expect(() =>
      upsertEntity(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        {
          type: "text",
          inputs: {},
        },
        {
          parentId: "invalid",
        },
        {
          data: {
            entities: new Map(),
            root: new Set(),
          },
          builder: createBuilder({
            entities: [createEntity({ name: "text" })],
          }),
        },
      ),
    ).toThrowErrorMatchingSnapshot();
  });

  it("does nothing when updating an entity without providing a parent ID and index", () => {
    expect(
      upsertEntity(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        {
          type: "text",
          inputs: {},
        },
        {},
        {
          data: {
            entities: new Map([
              [
                "6e0035c3-0d4c-445f-a42b-2d971225447c",
                { type: "text", inputs: {} },
              ],
            ]),
            root: new Set(["6e0035c3-0d4c-445f-a42b-2d971225447c"]),
          },
          builder: createBuilder({
            entities: [createEntity({ name: "text" })],
          }),
        },
      ),
    ).toMatchSnapshot();
  });

  it("moves an entity to root when the provided parent ID is null", () => {
    expect(
      upsertEntity(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        {
          type: "text",
          inputs: {},
          parentId: "38781207-38ae-4299-a52a-2da92fce2c84",
        },
        {
          parentId: null,
        },
        {
          data: {
            entities: new Map([
              [
                "6e0035c3-0d4c-445f-a42b-2d971225447c",
                {
                  type: "text",
                  inputs: {},
                  parentId: "38781207-38ae-4299-a52a-2da92fce2c84",
                },
              ],
              [
                "38781207-38ae-4299-a52a-2da92fce2c84",
                {
                  type: "text",
                  inputs: {},
                  children: new Set(["6e0035c3-0d4c-445f-a42b-2d971225447c"]),
                },
              ],
            ]),
            root: new Set(["38781207-38ae-4299-a52a-2da92fce2c84"]),
          },
          builder: createBuilder({
            entities: [createEntity({ name: "text" })],
            childrenAllowed: { text: true },
          }),
        },
      ),
    ).toMatchSnapshot();
  });

  it("moves an entity to root at specific index when the provided parent ID is null and index is provided", () => {
    expect(
      upsertEntity(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        {
          type: "text",
          inputs: {},
          parentId: "38781207-38ae-4299-a52a-2da92fce2c84",
        },
        {
          parentId: null,
          index: 0,
        },
        {
          data: {
            entities: new Map([
              [
                "6e0035c3-0d4c-445f-a42b-2d971225447c",
                {
                  type: "text",
                  inputs: {},
                  parentId: "38781207-38ae-4299-a52a-2da92fce2c84",
                },
              ],
              [
                "38781207-38ae-4299-a52a-2da92fce2c84",
                {
                  type: "text",
                  inputs: {},
                  children: new Set(["6e0035c3-0d4c-445f-a42b-2d971225447c"]),
                },
              ],
            ]),
            root: new Set(["38781207-38ae-4299-a52a-2da92fce2c84"]),
          },
          builder: createBuilder({
            entities: [createEntity({ name: "text" })],
            childrenAllowed: { text: true },
          }),
        },
      ),
    ).toMatchSnapshot();
  });

  it("moves an entity as last to a parent when parent ID was provided and index was not provided", () => {
    expect(
      upsertEntity(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        {
          type: "text",
          inputs: {},
        },
        {
          parentId: "38781207-38ae-4299-a52a-2da92fce2c84",
        },
        {
          data: {
            entities: new Map([
              [
                "6e0035c3-0d4c-445f-a42b-2d971225447c",
                {
                  type: "text",
                  inputs: {},
                },
              ],
              [
                "51324b32-adc3-4d17-a90e-66b5453935bd",
                {
                  type: "text",
                  inputs: {},
                  parentId: "38781207-38ae-4299-a52a-2da92fce2c84",
                },
              ],
              [
                "38781207-38ae-4299-a52a-2da92fce2c84",
                {
                  type: "text",
                  inputs: {},
                  children: new Set(["51324b32-adc3-4d17-a90e-66b5453935bd"]),
                },
              ],
            ]),
            root: new Set([
              "38781207-38ae-4299-a52a-2da92fce2c84",
              "6e0035c3-0d4c-445f-a42b-2d971225447c",
            ]),
          },
          builder: createBuilder({
            entities: [createEntity({ name: "text" })],
            childrenAllowed: { text: true },
          }),
        },
      ),
    ).toMatchSnapshot();
  });

  it("moves an entity to a parent at specific index when parent ID and index were provided", () => {
    expect(
      upsertEntity(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        {
          type: "text",
          inputs: {},
        },
        {
          parentId: "38781207-38ae-4299-a52a-2da92fce2c84",
          index: 0,
        },
        {
          data: {
            entities: new Map([
              [
                "6e0035c3-0d4c-445f-a42b-2d971225447c",
                {
                  type: "text",
                  inputs: {},
                },
              ],
              [
                "51324b32-adc3-4d17-a90e-66b5453935bd",
                {
                  type: "text",
                  inputs: {},
                  parentId: "38781207-38ae-4299-a52a-2da92fce2c84",
                },
              ],
              [
                "38781207-38ae-4299-a52a-2da92fce2c84",
                {
                  type: "text",
                  inputs: {},
                  children: new Set(["51324b32-adc3-4d17-a90e-66b5453935bd"]),
                },
              ],
            ]),
            root: new Set([
              "38781207-38ae-4299-a52a-2da92fce2c84",
              "6e0035c3-0d4c-445f-a42b-2d971225447c",
            ]),
          },
          builder: createBuilder({
            entities: [createEntity({ name: "text" })],
            childrenAllowed: { text: true },
          }),
        },
      ),
    ).toMatchSnapshot();
  });

  it("moves an entity to from a parent to another parent when parent ID was provided", () => {
    expect(
      upsertEntity(
        "51324b32-adc3-4d17-a90e-66b5453935bd",
        {
          type: "text",
          inputs: {},
          parentId: "38781207-38ae-4299-a52a-2da92fce2c84",
        },
        {
          parentId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
        },
        {
          data: {
            entities: new Map([
              [
                "6e0035c3-0d4c-445f-a42b-2d971225447c",
                {
                  type: "text",
                  inputs: {},
                },
              ],
              [
                "51324b32-adc3-4d17-a90e-66b5453935bd",
                {
                  type: "text",
                  inputs: {},
                  parentId: "38781207-38ae-4299-a52a-2da92fce2c84",
                },
              ],
              [
                "38781207-38ae-4299-a52a-2da92fce2c84",
                {
                  type: "text",
                  inputs: {},
                  children: new Set(["51324b32-adc3-4d17-a90e-66b5453935bd"]),
                },
              ],
            ]),
            root: new Set([
              "38781207-38ae-4299-a52a-2da92fce2c84",
              "6e0035c3-0d4c-445f-a42b-2d971225447c",
            ]),
          },
          builder: createBuilder({
            entities: [createEntity({ name: "text" })],
            childrenAllowed: { text: true },
          }),
        },
      ),
    ).toMatchSnapshot();
  });
});
