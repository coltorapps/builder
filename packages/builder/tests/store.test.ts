import { afterEach, describe, expect, it, vi } from "vitest";

import { createBuilder, createEntity, createInput, createStore } from "../src";
import * as schemaExports from "../src/schema";
import * as uuidExports from "../src/uuid";

describe("store", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("can be created without a schema", () => {
    const builder = createBuilder({
      entities: [],
    });

    const store = createStore(builder);

    expect(store).toMatchInlineSnapshot(`
      {
        "addEntity": [Function],
        "builder": {
          "childrenAllowed": {},
          "entities": [],
          "entityId": {
            "generate": [Function],
            "validate": [Function],
          },
          "parentRequired": [],
        },
        "getData": [Function],
        "getSchema": [Function],
        "subscribe": [Function],
      }
    `);
  });

  it("can be created with a non-empty schema", () => {
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

    expect(store).toMatchInlineSnapshot(`
      {
        "addEntity": [Function],
        "builder": {
          "childrenAllowed": {},
          "entities": [
            {
              "defaultValue": [Function],
              "inputs": [
                {
                  "defaultValue": [Function],
                  "name": "label",
                  "validate": [Function],
                },
              ],
              "isValueAllowed": false,
              "name": "text",
              "shouldBeProcessed": [Function],
              "validate": [Function],
            },
          ],
          "entityId": {
            "generate": [Function],
            "validate": [Function],
          },
          "parentRequired": [],
        },
        "getData": [Function],
        "getSchema": [Function],
        "subscribe": [Function],
      }
    `);
  });

  it("can be created with an empty schema", () => {
    const builder = createBuilder({
      entities: [],
    });

    const store = createStore(builder, { entities: {}, root: [] });

    expect(store).toMatchInlineSnapshot(`
      {
        "addEntity": [Function],
        "builder": {
          "childrenAllowed": {},
          "entities": [],
          "entityId": {
            "generate": [Function],
            "validate": [Function],
          },
          "parentRequired": [],
        },
        "getData": [Function],
        "getSchema": [Function],
        "subscribe": [Function],
      }
    `);
  });

  it("can retrieve the data", () => {
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

    expect(store.getData()).toMatchInlineSnapshot(`
      {
        "entities": Map {
          "6e0035c3-0d4c-445f-a42b-2d971225447c" => {
            "inputs": {
              "label": "test",
            },
            "type": "text",
          },
        },
        "root": Set {
          "6e0035c3-0d4c-445f-a42b-2d971225447c",
        },
      }
    `);
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

    expect(store.getSchema()).toMatchInlineSnapshot(`
      {
        "entities": {
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            "inputs": {
              "label": "test",
            },
            "type": "text",
          },
        },
        "root": [
          "6e0035c3-0d4c-445f-a42b-2d971225447c",
        ],
      }
    `);
  });

  it("can add entities and notify listeners", () => {
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
    });

    const store = createStore(builder, {
      entities: {},
      root: [],
    });

    const listener = vi.fn();

    store.subscribe(listener);

    store.addEntity({ type: "text", inputs: {} });

    expect(store.getData()).toMatchInlineSnapshot(`
      {
        "entities": Map {
          "6e0035c3-0d4c-445f-a42b-2d971225447c" => {
            "inputs": {},
            "type": "text",
          },
        },
        "root": Set {
          "6e0035c3-0d4c-445f-a42b-2d971225447c",
        },
      }
    `);

    expect(listener).toHaveBeenCalledWith({
      entities: new Map([
        ["6e0035c3-0d4c-445f-a42b-2d971225447c", { inputs: {}, type: "text" }],
      ]),
      root: new Set(["6e0035c3-0d4c-445f-a42b-2d971225447c"]),
    });
  });

  it("validates the parent when adding entities", () => {
    const ensureEntityParentIdHasValidReferenceMock = vi.spyOn(
      schemaExports,
      "ensureEntityParentIdHasValidReference",
    );

    const ensureEntityChildAllowedMock = vi.spyOn(
      schemaExports,
      "ensureEntityChildAllowed",
    );

    const ensureEntityCanLackParentMock = vi.spyOn(
      schemaExports,
      "ensureEntityCanLackParent",
    );

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
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          type: "test",
          inputs: {},
        },
      },
      root: [],
    });

    store.addEntity({
      type: "test",
      inputs: {},
      parentId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
    });

    expect(ensureEntityParentIdHasValidReferenceMock).toHaveBeenCalledWith(
      {
        id: "6e0035c3-0d4c-445f-a42b-2d971225447c",
        inputs: {},
        parentId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
        type: "test",
      },
      {
        "c1ab14a4-41db-4531-9a58-4825a9ef6d26": {
          type: "test",
          inputs: {},
        },
      },
    );

    expect(ensureEntityChildAllowedMock).toHaveBeenCalledWith(
      {
        id: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
        type: "test",
        inputs: {},
      },
      {
        id: "6e0035c3-0d4c-445f-a42b-2d971225447c",
        inputs: {},
        parentId: "c1ab14a4-41db-4531-9a58-4825a9ef6d26",
        type: "test",
      },
      builder,
    );

    expect(ensureEntityCanLackParentMock).not.toHaveBeenCalled();
  });

  it("ensures an entity can lack a parent ID when added", () => {
    const ensureEntityCanLackParentMock = vi.spyOn(
      schemaExports,
      "ensureEntityCanLackParent",
    );

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

    const store = createStore(builder, {
      entities: {},
      root: [],
    });

    store.addEntity({
      type: "test",
      inputs: {},
    });

    expect(ensureEntityCanLackParentMock).toHaveBeenCalledWith(
      {
        id: "6e0035c3-0d4c-445f-a42b-2d971225447c",
        inputs: {},
        type: "test",
      },
      builder,
    );
  });
});
