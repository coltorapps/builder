import { afterEach, describe, expect, it, vi } from "vitest";

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

    expect(store.getData()).toMatchSnapshot();
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

    const schema: schemaExports.Schema = {
      entities: {
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "text",
          inputs: {
            label: "test",
          },
        },
      },
      root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
    };

    const store = createStore(builder, schema);

    const baseValidateSchemaMock = vi.spyOn(
      schemaExports,
      "baseValidateSchema",
    );

    expect(store.getSchema()).toMatchSnapshot();

    expect(baseValidateSchemaMock).toHaveBeenCalledWith(builder, schema);
  });

  it("can return the data", () => {
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
          ],
        }),
      ],
      childrenAllowed: {
        test: true,
      },
    });

    const schema: schemaExports.Schema = {
      entities: {
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "test",
          inputs: {
            label: "test",
          },
          children: ["98b6d050-192f-47e3-8690-7d263c25b45a"],
        },
        "98b6d050-192f-47e3-8690-7d263c25b45a": {
          type: "test",
          inputs: {
            label: "test",
          },
          parentId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
        },
      },
      root: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
    };

    const store = createStore(builder, schema);

    const baseValidateSchemaMock = vi.spyOn(
      schemaExports,
      "baseValidateSchema",
    );

    expect(store.getData()).toMatchSnapshot();

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

    const entitiesSchema: schemaExports.Schema<typeof builder>["entities"] = {
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
    };

    const store = createStore(builder, {
      entities: entitiesSchema,
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
