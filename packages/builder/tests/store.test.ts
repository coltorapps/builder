import { afterEach, describe, expect, it, vi } from "vitest";

import { createBuilder, createEntity, createInput, createStore } from "../src";
import * as schemaValidationExports from "../src/schema-validation";
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
        "getEntity": [Function],
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
        "getEntity": [Function],
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
        "getEntity": [Function],
        "getSchema": [Function],
        "subscribe": [Function],
      }
    `);
  });

  it("validates the schema during creation", () => {
    const builder = createBuilder({
      entities: [],
    });

    const validateSchemaMock = vi.spyOn(
      schemaValidationExports,
      "validateSchema",
    );

    createStore(builder, { entities: {}, root: [] });

    expect(validateSchemaMock).toHaveBeenLastCalledWith(builder, {
      entities: {},
      root: [],
    });

    createStore(builder);

    expect(validateSchemaMock).toHaveBeenLastCalledWith(builder, undefined);
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

  it("can retrieve the schema", () => {
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

  it("can retrieve an entity", () => {
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

    expect(store.getEntity("6e0035c3-0d4c-445f-a42b-2d971225447c"))
      .toMatchInlineSnapshot(`
      {
        "id": "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "inputs": {
          "label": "test",
        },
        "parentId": "",
        "type": "text",
      }
    `);

    expect(store.getEntity("non-existent")).toMatchInlineSnapshot("undefined");
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
});
