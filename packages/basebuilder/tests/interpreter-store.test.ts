import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createBuilder, createEntity } from "../src";
import * as entitiesValuesExports from "../src/entities-values";
import {
  computeUnprocessableEntities,
  createInterpreterStore,
  deserializeAndValidateInterpreterStoreData,
} from "../src/interpreter-store";
import * as schemaExports from "../src/schema";

describe("interpreter store", () => {
  it("can be created", () => {
    const validateSchemaIntegrityMock = vi.spyOn(
      schemaExports,
      "validateSchemaIntegrity",
    );

    const schema = {
      entities: {},
      root: [],
    };

    const builder = createBuilder({
      entities: [],
    });

    const interpreterStore = createInterpreterStore(builder, schema);

    expect(interpreterStore).toMatchSnapshot();

    expect(validateSchemaIntegrityMock).toHaveBeenCalledWith(schema, builder);
  });

  it("resets entities values when created", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          defaultValue() {
            return "default";
          },
          validate() {
            return "";
          },
        }),
        createEntity({
          name: "select",
          validate() {
            return "";
          },
        }),
        createEntity({
          name: "section",
        }),
      ],
    });

    const interpreterStore = createInterpreterStore(builder, {
      entities: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": {
          type: "text",
          attributes: {},
        },
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "select",
          attributes: {},
        },
        "2df173ee-6b88-4744-a74d-0f21d49166b3": {
          type: "section",
          attributes: {},
        },
      },
      root: [
        "51324b32-adc3-4d17-a90e-66b5453935bd",
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "2df173ee-6b88-4744-a74d-0f21d49166b3",
      ],
    });

    expect(interpreterStore.getData().entitiesValues).toMatchSnapshot();
  });

  it("doesn't reset entities values when created if configured to", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          defaultValue() {
            return "default";
          },
          validate() {
            return "";
          },
        }),
      ],
    });

    const interpreterStore = createInterpreterStore(
      builder,
      {
        entities: {
          "51324b32-adc3-4d17-a90e-66b5453935bd": {
            type: "text",
            attributes: {},
          },
        },
        root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
      },
      {
        initialEntitiesValuesWithDefaults: false,
      },
    );

    expect(interpreterStore.getData().entitiesValues).toMatchSnapshot();
  });

  it("can return the data", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          defaultValue() {
            return "default";
          },
          validate() {
            return "";
          },
        }),
      ],
    });

    const interpreterStore = createInterpreterStore(builder, {
      entities: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": {
          type: "text",
          attributes: {},
        },
      },
      root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
    });

    expect(interpreterStore.getData()).toMatchSnapshot();
  });

  it("can be created with initial data", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          defaultValue() {
            return "default";
          },
          validate() {
            return "";
          },
        }),
        createEntity({
          name: "select",
          validate() {
            return "";
          },
          defaultValue() {
            return "default";
          },
        }),
        createEntity({
          name: "section",
        }),
      ],
    });

    const interpreterStore = createInterpreterStore(
      builder,
      {
        entities: {
          "51324b32-adc3-4d17-a90e-66b5453935bd": {
            type: "text",
            attributes: {},
          },
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            type: "select",
            attributes: {},
          },
          "2df173ee-6b88-4744-a74d-0f21d49166b3": {
            type: "section",
            attributes: {},
          },
        },
        root: [
          "51324b32-adc3-4d17-a90e-66b5453935bd",
          "6e0035c3-0d4c-445f-a42b-2d971225447c",
          "2df173ee-6b88-4744-a74d-0f21d49166b3",
        ],
      },
      {
        initialData: {
          entitiesValues: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": undefined,
          },
          entitiesErrors: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": "error",
          },
        },
      },
    );

    expect(interpreterStore.getData()).toMatchSnapshot();
  });

  it("can set the data", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          defaultValue() {
            return "default";
          },
          validate() {
            return "";
          },
        }),
        createEntity({
          name: "select",
          validate() {
            return "";
          },
          defaultValue() {
            return "default";
          },
        }),
        createEntity({
          name: "section",
        }),
      ],
    });

    const interpreterStore = createInterpreterStore(builder, {
      entities: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": {
          type: "text",
          attributes: {},
        },
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "select",
          attributes: {},
        },
        "2df173ee-6b88-4744-a74d-0f21d49166b3": {
          type: "section",
          attributes: {},
        },
      },
      root: [
        "51324b32-adc3-4d17-a90e-66b5453935bd",
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "2df173ee-6b88-4744-a74d-0f21d49166b3",
      ],
    });

    const listener = vi.fn();

    interpreterStore.subscribe(listener);

    interpreterStore.setData({
      entitiesValues: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": "new value",
      },
      entitiesErrors: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": "new error",
      },
    });

    expect(() =>
      interpreterStore.setData({
        entitiesValues: {
          "2df173ee-6b88-4744-a74d-0f21d49166b3": "new value",
        },
        entitiesErrors: {},
      }),
    ).toThrowErrorMatchingSnapshot();

    expect(() =>
      interpreterStore.setData({
        entitiesValues: {},
        entitiesErrors: {
          "2df173ee-6b88-4744-a74d-0f21d49166b3": "new error",
        },
      }),
    ).toThrowErrorMatchingSnapshot();

    expect(interpreterStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can set an entity value", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          defaultValue() {
            return "default";
          },
          validate() {
            return "";
          },
        }),
        createEntity({
          name: "select",
          validate() {
            return "";
          },
          defaultValue() {
            return "default";
          },
        }),
        createEntity({
          name: "section",
        }),
      ],
    });

    const interpreterStore = createInterpreterStore(
      builder,
      {
        entities: {
          "51324b32-adc3-4d17-a90e-66b5453935bd": {
            type: "text",
            attributes: {},
          },
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            type: "select",
            attributes: {},
          },
          "2df173ee-6b88-4744-a74d-0f21d49166b3": {
            type: "section",
            attributes: {},
          },
        },
        root: [
          "51324b32-adc3-4d17-a90e-66b5453935bd",
          "6e0035c3-0d4c-445f-a42b-2d971225447c",
          "2df173ee-6b88-4744-a74d-0f21d49166b3",
        ],
      },
      {
        initialData: {
          entitiesValues: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": "text value",
            "6e0035c3-0d4c-445f-a42b-2d971225447c": "select value",
          },
        },
      },
    );

    const listener = vi.fn();

    interpreterStore.subscribe(listener);

    interpreterStore.setEntityValue(
      "51324b32-adc3-4d17-a90e-66b5453935bd",
      "new value",
    );

    expect(() =>
      interpreterStore.setEntityValue(
        "2df173ee-6b88-4744-a74d-0f21d49166b3",
        "new value",
      ),
    ).toThrowErrorMatchingSnapshot();

    expect(interpreterStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can reset an entity value", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          defaultValue() {
            return "default";
          },
          validate() {
            return "";
          },
        }),
        createEntity({
          name: "select",
          validate() {
            return "";
          },
          defaultValue() {
            return "default";
          },
        }),
        createEntity({
          name: "section",
        }),
      ],
    });

    const interpreterStore = createInterpreterStore(
      builder,
      {
        entities: {
          "51324b32-adc3-4d17-a90e-66b5453935bd": {
            type: "text",
            attributes: {},
          },
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            type: "select",
            attributes: {},
          },
          "2df173ee-6b88-4744-a74d-0f21d49166b3": {
            type: "section",
            attributes: {},
          },
        },
        root: [
          "51324b32-adc3-4d17-a90e-66b5453935bd",
          "6e0035c3-0d4c-445f-a42b-2d971225447c",
          "2df173ee-6b88-4744-a74d-0f21d49166b3",
        ],
      },
      {
        initialData: {
          entitiesValues: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": "text value",
            "6e0035c3-0d4c-445f-a42b-2d971225447c": "select value",
          },
        },
      },
    );

    const listener = vi.fn();

    interpreterStore.subscribe(listener);

    interpreterStore.resetEntityValue("51324b32-adc3-4d17-a90e-66b5453935bd");

    expect(() =>
      interpreterStore.resetEntityValue("2df173ee-6b88-4744-a74d-0f21d49166b3"),
    ).toThrowErrorMatchingSnapshot();

    expect(interpreterStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can reset all entities values", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          defaultValue() {
            return "default";
          },
          validate() {
            return "";
          },
        }),
        createEntity({
          name: "select",
          validate() {
            return "";
          },
          defaultValue() {
            return "default";
          },
        }),
      ],
    });

    const interpreterStore = createInterpreterStore(
      builder,
      {
        entities: {
          "51324b32-adc3-4d17-a90e-66b5453935bd": {
            type: "text",
            attributes: {},
          },
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            type: "select",
            attributes: {},
          },
        },
        root: [
          "51324b32-adc3-4d17-a90e-66b5453935bd",
          "6e0035c3-0d4c-445f-a42b-2d971225447c",
        ],
      },
      {
        initialData: {
          entitiesValues: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": "text value",
            "6e0035c3-0d4c-445f-a42b-2d971225447c": "select value",
          },
        },
      },
    );

    const listener = vi.fn();

    interpreterStore.subscribe(listener);

    interpreterStore.resetEntitiesValues();

    expect(interpreterStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can clear an entity value", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          defaultValue() {
            return "default";
          },
          validate() {
            return "";
          },
        }),
        createEntity({
          name: "select",
          validate() {
            return "";
          },
          defaultValue() {
            return "default";
          },
        }),
        createEntity({
          name: "section",
        }),
      ],
    });

    const interpreterStore = createInterpreterStore(
      builder,
      {
        entities: {
          "51324b32-adc3-4d17-a90e-66b5453935bd": {
            type: "text",
            attributes: {},
          },
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            type: "select",
            attributes: {},
          },
          "2df173ee-6b88-4744-a74d-0f21d49166b3": {
            type: "section",
            attributes: {},
          },
        },
        root: [
          "51324b32-adc3-4d17-a90e-66b5453935bd",
          "6e0035c3-0d4c-445f-a42b-2d971225447c",
          "2df173ee-6b88-4744-a74d-0f21d49166b3",
        ],
      },
      {
        initialData: {
          entitiesValues: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": "text value",
            "6e0035c3-0d4c-445f-a42b-2d971225447c": "select value",
          },
        },
      },
    );

    const listener = vi.fn();

    interpreterStore.subscribe(listener);

    interpreterStore.clearEntityValue("51324b32-adc3-4d17-a90e-66b5453935bd");

    expect(() =>
      interpreterStore.clearEntityValue("2df173ee-6b88-4744-a74d-0f21d49166b3"),
    ).toThrowErrorMatchingSnapshot();

    expect(interpreterStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can clear all entities values", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          defaultValue() {
            return "default";
          },
          validate() {
            return "";
          },
        }),
        createEntity({
          name: "select",
          validate() {
            return "";
          },
          defaultValue() {
            return "default";
          },
        }),
      ],
    });

    const interpreterStore = createInterpreterStore(
      builder,
      {
        entities: {
          "51324b32-adc3-4d17-a90e-66b5453935bd": {
            type: "text",
            attributes: {},
          },
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            type: "select",
            attributes: {},
          },
        },
        root: [
          "51324b32-adc3-4d17-a90e-66b5453935bd",
          "6e0035c3-0d4c-445f-a42b-2d971225447c",
        ],
      },
      {
        initialData: {
          entitiesValues: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": "text value",
            "6e0035c3-0d4c-445f-a42b-2d971225447c": "select value",
          },
        },
      },
    );

    const listener = vi.fn();

    interpreterStore.subscribe(listener);

    interpreterStore.clearEntitiesValues();

    expect(interpreterStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can set an entity error", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          defaultValue() {
            return "default";
          },
          validate() {
            return "";
          },
        }),
        createEntity({
          name: "select",
          validate() {
            return "";
          },
          defaultValue() {
            return "default";
          },
        }),
        createEntity({
          name: "section",
        }),
      ],
    });

    const interpreterStore = createInterpreterStore(
      builder,
      {
        entities: {
          "51324b32-adc3-4d17-a90e-66b5453935bd": {
            type: "text",
            attributes: {},
          },
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            type: "select",
            attributes: {},
          },
          "2df173ee-6b88-4744-a74d-0f21d49166b3": {
            type: "section",
            attributes: {},
          },
        },
        root: [
          "51324b32-adc3-4d17-a90e-66b5453935bd",
          "6e0035c3-0d4c-445f-a42b-2d971225447c",
          "2df173ee-6b88-4744-a74d-0f21d49166b3",
        ],
      },
      {
        initialData: {
          entitiesErrors: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": "text error",
            "6e0035c3-0d4c-445f-a42b-2d971225447c": "select error",
          },
        },
      },
    );

    const listener = vi.fn();

    interpreterStore.subscribe(listener);

    interpreterStore.setEntityError(
      "51324b32-adc3-4d17-a90e-66b5453935bd",
      "new error",
    );

    expect(() =>
      interpreterStore.setEntityError(
        "2df173ee-6b88-4744-a74d-0f21d49166b3",
        "new error",
      ),
    ).toThrowErrorMatchingSnapshot();

    expect(interpreterStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can reset an entity error", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          defaultValue() {
            return "default";
          },
          validate() {
            return "";
          },
        }),
        createEntity({
          name: "select",
          validate() {
            return "";
          },
          defaultValue() {
            return "default";
          },
        }),
        createEntity({
          name: "section",
        }),
      ],
    });

    const interpreterStore = createInterpreterStore(
      builder,
      {
        entities: {
          "51324b32-adc3-4d17-a90e-66b5453935bd": {
            type: "text",
            attributes: {},
          },
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            type: "select",
            attributes: {},
          },
          "2df173ee-6b88-4744-a74d-0f21d49166b3": {
            type: "section",
            attributes: {},
          },
        },
        root: [
          "51324b32-adc3-4d17-a90e-66b5453935bd",
          "6e0035c3-0d4c-445f-a42b-2d971225447c",
          "2df173ee-6b88-4744-a74d-0f21d49166b3",
        ],
      },
      {
        initialData: {
          entitiesErrors: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": "text error",
            "6e0035c3-0d4c-445f-a42b-2d971225447c": "select error",
          },
        },
      },
    );

    const listener = vi.fn();

    interpreterStore.subscribe(listener);

    interpreterStore.resetEntityError("51324b32-adc3-4d17-a90e-66b5453935bd");

    expect(() =>
      interpreterStore.resetEntityError("2df173ee-6b88-4744-a74d-0f21d49166b3"),
    ).toThrowErrorMatchingSnapshot();

    expect(interpreterStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can reset all entities errors", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          defaultValue() {
            return "default";
          },
          validate() {
            return "";
          },
        }),
        createEntity({
          name: "select",
          validate() {
            return "";
          },
          defaultValue() {
            return "default";
          },
        }),
      ],
    });

    const interpreterStore = createInterpreterStore(
      builder,
      {
        entities: {
          "51324b32-adc3-4d17-a90e-66b5453935bd": {
            type: "text",
            attributes: {},
          },
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            type: "select",
            attributes: {},
          },
        },
        root: [
          "51324b32-adc3-4d17-a90e-66b5453935bd",
          "6e0035c3-0d4c-445f-a42b-2d971225447c",
        ],
      },
      {
        initialData: {
          entitiesErrors: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": "text error",
            "6e0035c3-0d4c-445f-a42b-2d971225447c": "select error",
          },
        },
      },
    );

    const listener = vi.fn();

    interpreterStore.subscribe(listener);

    interpreterStore.resetEntitiesErrors();

    expect(interpreterStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can set entities errors", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          defaultValue() {
            return "default";
          },
          validate() {
            return "";
          },
        }),
        createEntity({
          name: "select",
          validate() {
            return "";
          },
          defaultValue() {
            return "default";
          },
        }),
        createEntity({
          name: "section",
        }),
      ],
    });

    const interpreterStore = createInterpreterStore(
      builder,
      {
        entities: {
          "51324b32-adc3-4d17-a90e-66b5453935bd": {
            type: "text",
            attributes: {},
          },
          "6e0035c3-0d4c-445f-a42b-2d971225447c": {
            type: "select",
            attributes: {},
          },
          "e31665da-9663-4a4f-87ac-cd326760863e": {
            type: "select",
            attributes: {},
          },
          "2df173ee-6b88-4744-a74d-0f21d49166b3": {
            type: "section",
            attributes: {},
          },
        },
        root: [
          "51324b32-adc3-4d17-a90e-66b5453935bd",
          "6e0035c3-0d4c-445f-a42b-2d971225447c",
          "2df173ee-6b88-4744-a74d-0f21d49166b3",
          "e31665da-9663-4a4f-87ac-cd326760863e",
        ],
      },
      {
        initialData: {
          entitiesErrors: {
            "51324b32-adc3-4d17-a90e-66b5453935bd": "text error",
            "6e0035c3-0d4c-445f-a42b-2d971225447c": "select error",
            "e31665da-9663-4a4f-87ac-cd326760863e": "initial error",
          },
        },
      },
    );

    const listener = vi.fn();

    interpreterStore.subscribe(listener);

    interpreterStore.setEntitiesErrors({
      "51324b32-adc3-4d17-a90e-66b5453935bd": "new text error",
      "6e0035c3-0d4c-445f-a42b-2d971225447c": "new select error",
    });

    expect(() =>
      interpreterStore.setEntitiesErrors({
        "2df173ee-6b88-4744-a74d-0f21d49166b3": "new section error",
      }),
    ).toThrowErrorMatchingSnapshot();

    expect(interpreterStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("can validate entities", async () => {
    const validateEntityValueMock = vi.spyOn(
      entitiesValuesExports,
      "validateEntityValue",
    );

    const getEligibleEntitiesIdsForValidationMock = vi.spyOn(
      entitiesValuesExports,
      "getEligibleEntitiesIdsForValidation",
    );

    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          validate(value) {
            return z.string().parse(value);
          },
        }),
      ],
    });

    const schema = {
      entities: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": {
          type: "text",
          attributes: {},
        },
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "text",
          attributes: {},
        },
        "2df173ee-6b88-4744-a74d-0f21d49166b3": {
          type: "text",
          attributes: {},
        },
      },
      root: [
        "51324b32-adc3-4d17-a90e-66b5453935bd",
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "2df173ee-6b88-4744-a74d-0f21d49166b3",
      ],
    } as const;

    const interpreterStore = createInterpreterStore(builder, schema, {
      initialData: {
        entitiesValues: {
          "2df173ee-6b88-4744-a74d-0f21d49166b3": "valid",
        },
        entitiesErrors: {
          "51324b32-adc3-4d17-a90e-66b5453935bd": "initial text error",
        },
      },
    });

    const listener = vi.fn();

    interpreterStore.subscribe(listener);

    await interpreterStore.validateEntity(
      "51324b32-adc3-4d17-a90e-66b5453935bd",
    );

    await interpreterStore.validateEntity(
      "2df173ee-6b88-4744-a74d-0f21d49166b3",
    );

    await interpreterStore.validateEntities();

    expect(interpreterStore.getData()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();

    const entitiesValues = {
      "2df173ee-6b88-4744-a74d-0f21d49166b3": "valid",
      "51324b32-adc3-4d17-a90e-66b5453935bd": undefined,
      "6e0035c3-0d4c-445f-a42b-2d971225447c": undefined,
    };

    expect(getEligibleEntitiesIdsForValidationMock).toHaveBeenNthCalledWith(
      1,
      entitiesValues,
      builder,
      schema,
    );

    expect(getEligibleEntitiesIdsForValidationMock).toHaveBeenNthCalledWith(
      2,
      entitiesValues,
      builder,
      schema,
    );

    expect(validateEntityValueMock).toHaveBeenNthCalledWith(
      1,
      "51324b32-adc3-4d17-a90e-66b5453935bd",
      entitiesValues,
      builder,
      schema,
    );

    expect(validateEntityValueMock).toHaveBeenNthCalledWith(
      2,
      "2df173ee-6b88-4744-a74d-0f21d49166b3",
      entitiesValues,
      builder,
      schema,
    );

    expect(validateEntityValueMock).toHaveBeenNthCalledWith(
      3,
      "51324b32-adc3-4d17-a90e-66b5453935bd",
      entitiesValues,
      builder,
      schema,
    );

    expect(validateEntityValueMock).toHaveBeenNthCalledWith(
      4,
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
      entitiesValues,
      builder,
      schema,
    );

    expect(validateEntityValueMock).toHaveBeenNthCalledWith(
      5,
      "2df173ee-6b88-4744-a74d-0f21d49166b3",
      entitiesValues,
      builder,
      schema,
    );
  });

  it("computes entities processability when created", () => {
    const schema = {
      entities: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": {
          type: "text",
          attributes: {},
        },
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "text",
          attributes: {},
        },
      },
      root: [
        "51324b32-adc3-4d17-a90e-66b5453935bd",
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
      ],
    } as const;

    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          shouldBeProcessed: (context) =>
            context.entity.id === "6e0035c3-0d4c-445f-a42b-2d971225447c",
        }),
      ],
    });

    const interpreterStore = createInterpreterStore(builder, schema);

    expect(interpreterStore.getUnprocessableEntitiesIds()).toMatchSnapshot();

    expect(
      interpreterStore.isEntityProcessable(
        "51324b32-adc3-4d17-a90e-66b5453935bd",
      ),
    ).toMatchSnapshot();

    expect(
      interpreterStore.isEntityProcessable(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
      ),
    ).toMatchSnapshot();
  });

  it("computes entities processability when updating values", () => {
    const schema = {
      entities: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": {
          type: "text",
          attributes: {},
        },
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "text",
          attributes: {},
        },
      },
      root: [
        "51324b32-adc3-4d17-a90e-66b5453935bd",
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
      ],
    } as const;

    let processable = true;

    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          shouldBeProcessed: (context) =>
            context.entity.id === "6e0035c3-0d4c-445f-a42b-2d971225447c" ||
            processable,
          validate: (): string | undefined => {
            return;
          },
        }),
      ],
    });

    const interpreterStore = createInterpreterStore(builder, schema);

    const listener = vi.fn();

    interpreterStore.subscribe(listener);

    processable = false;

    interpreterStore.setEntityValue(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
      "test",
    );

    processable = true;

    interpreterStore.setEntityValue(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
      "test",
    );

    interpreterStore.setEntityValue(
      "51324b32-adc3-4d17-a90e-66b5453935bd",
      undefined,
    );

    expect(interpreterStore.getUnprocessableEntitiesIds()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("computes entities processability when resetting values", () => {
    const schema = {
      entities: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": {
          type: "text",
          attributes: {},
        },
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "text",
          attributes: {},
        },
      },
      root: [
        "51324b32-adc3-4d17-a90e-66b5453935bd",
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
      ],
    } as const;

    let processable = true;

    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          shouldBeProcessed: (context) =>
            context.entity.id === "6e0035c3-0d4c-445f-a42b-2d971225447c" ||
            processable,
          validate: () => {
            return;
          },
        }),
      ],
    });

    const interpreterStore = createInterpreterStore(builder, schema);

    const listener = vi.fn();

    interpreterStore.subscribe(listener);

    processable = false;

    interpreterStore.resetEntityValue("6e0035c3-0d4c-445f-a42b-2d971225447c");

    processable = true;

    interpreterStore.resetEntityValue("6e0035c3-0d4c-445f-a42b-2d971225447c");

    interpreterStore.resetEntityValue("51324b32-adc3-4d17-a90e-66b5453935bd");

    expect(interpreterStore.getUnprocessableEntitiesIds()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("computes entities processability when resetting values of all entities", () => {
    const schema = {
      entities: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": {
          type: "text",
          attributes: {},
        },
      },
      root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
    } as const;

    let processable = true;

    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          shouldBeProcessed: () => processable,
          validate: () => {
            return;
          },
        }),
      ],
    });

    const interpreterStore = createInterpreterStore(builder, schema);

    const listener = vi.fn();

    interpreterStore.subscribe(listener);

    processable = false;

    interpreterStore.resetEntitiesValues();

    expect(interpreterStore.getUnprocessableEntitiesIds()).toMatchSnapshot();

    processable = true;

    interpreterStore.resetEntitiesValues();

    expect(interpreterStore.getUnprocessableEntitiesIds()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("computes entities processability when clearing values", () => {
    const schema = {
      entities: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": {
          type: "text",
          attributes: {},
        },
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "text",
          attributes: {},
        },
      },
      root: [
        "51324b32-adc3-4d17-a90e-66b5453935bd",
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
      ],
    } as const;

    let processable = true;

    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          shouldBeProcessed: (context) =>
            context.entity.id === "6e0035c3-0d4c-445f-a42b-2d971225447c" ||
            processable,
          validate: () => {
            return;
          },
        }),
      ],
    });

    const interpreterStore = createInterpreterStore(builder, schema);

    const listener = vi.fn();

    interpreterStore.subscribe(listener);

    processable = false;

    interpreterStore.clearEntityValue("6e0035c3-0d4c-445f-a42b-2d971225447c");

    processable = true;

    interpreterStore.clearEntityValue("6e0035c3-0d4c-445f-a42b-2d971225447c");

    interpreterStore.clearEntityValue("51324b32-adc3-4d17-a90e-66b5453935bd");

    expect(interpreterStore.getUnprocessableEntitiesIds()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("computes entities processability when clearing values of all entities", () => {
    const schema = {
      entities: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": {
          type: "text",
          attributes: {},
        },
      },
      root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
    } as const;

    let processable = true;

    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          shouldBeProcessed: () => processable,
          validate: () => {
            return;
          },
        }),
      ],
    });

    const interpreterStore = createInterpreterStore(builder, schema);

    const listener = vi.fn();

    interpreterStore.subscribe(listener);

    processable = false;

    interpreterStore.clearEntitiesValues();

    expect(interpreterStore.getUnprocessableEntitiesIds()).toMatchSnapshot();

    processable = true;

    interpreterStore.clearEntitiesValues();

    expect(interpreterStore.getUnprocessableEntitiesIds()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });

  it("computes entities processability when setting data", () => {
    const schema = {
      entities: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": {
          type: "text",
          attributes: {},
        },
      },
      root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
    } as const;

    let processable = true;

    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          shouldBeProcessed: () => processable,
          validate: () => {
            return "string";
          },
        }),
      ],
    });

    const interpreterStore = createInterpreterStore(builder, schema);

    const listener = vi.fn();

    interpreterStore.subscribe(listener);

    processable = false;

    interpreterStore.setData({
      entitiesValues: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": "string",
      },
      entitiesErrors: {},
    });

    expect(interpreterStore.getUnprocessableEntitiesIds()).toMatchSnapshot();

    processable = true;

    interpreterStore.setData({
      entitiesValues: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": "string",
      },
      entitiesErrors: {},
    });

    expect(interpreterStore.getUnprocessableEntitiesIds()).toMatchSnapshot();

    expect(listener).toMatchSnapshot();
  });
});

describe("unprocessable entities computation", () => {
  it("computes the unprocessable entities and events", () => {
    const schema = {
      entities: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": {
          type: "text",
          attributes: {},
        },
      },
      root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
    } as const;

    let processable = true;

    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          shouldBeProcessed: () => processable,
          validate: () => {
            return "string";
          },
        }),
      ],
    });

    const interpreterStore = createInterpreterStore(builder, schema);

    expect(
      computeUnprocessableEntities(
        schema,
        deserializeAndValidateInterpreterStoreData(
          interpreterStore.getData(),
          schema,
        ),
        builder,
      ),
    ).toMatchSnapshot();

    processable = false;

    expect(
      computeUnprocessableEntities(
        schema,
        deserializeAndValidateInterpreterStoreData(
          interpreterStore.getData(),
          schema,
        ),
        builder,
      ),
    ).toMatchSnapshot();

    processable = true;

    expect(
      computeUnprocessableEntities(
        schema,
        {
          entitiesValues: new Map(),
          entitiesErrors: new Map(),
          unprocessableEntitiesIds: new Set([
            "51324b32-adc3-4d17-a90e-66b5453935bd",
          ]),
        },
        builder,
      ),
    ).toMatchSnapshot();
  });

  it("computes the unprocessable entities recursively", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "text",
          shouldBeProcessed: (context) =>
            context.entitiesValues[context.entity.id] === "process",
          validate: () => {
            return "string";
          },
          childrenAllowed: true,
        }),
      ],
    });

    const schema: schemaExports.Schema<typeof builder> = {
      entities: {
        "51324b32-adc3-4d17-a90e-66b5453935bd": {
          type: "text",
          attributes: {},
          children: ["6e0035c3-0d4c-445f-a42b-2d971225447c"],
        },
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          type: "text",
          attributes: {},
          children: ["2df173ee-6b88-4744-a74d-0f21d49166b3"],
          parentId: "51324b32-adc3-4d17-a90e-66b5453935bd",
        },
        "2df173ee-6b88-4744-a74d-0f21d49166b3": {
          type: "text",
          attributes: {},
          parentId: "6e0035c3-0d4c-445f-a42b-2d971225447c",
        },
      },
      root: ["51324b32-adc3-4d17-a90e-66b5453935bd"],
    };

    expect(
      computeUnprocessableEntities(
        schema,
        {
          entitiesValues: new Map(),
          entitiesErrors: new Map(),
          unprocessableEntitiesIds: new Set([
            "2df173ee-6b88-4744-a74d-0f21d49166b3",
          ]),
        },
        builder,
      ),
    ).toMatchSnapshot();

    expect(
      computeUnprocessableEntities(
        schema,
        {
          entitiesValues: new Map([
            ["51324b32-adc3-4d17-a90e-66b5453935bd", "process"],
          ]),
          entitiesErrors: new Map(),
          unprocessableEntitiesIds: new Set([
            "2df173ee-6b88-4744-a74d-0f21d49166b3",
          ]),
        },
        builder,
      ),
    ).toMatchSnapshot();

    expect(
      computeUnprocessableEntities(
        schema,
        {
          entitiesValues: new Map([
            ["51324b32-adc3-4d17-a90e-66b5453935bd", "process"],
            ["6e0035c3-0d4c-445f-a42b-2d971225447c", "process"],
          ]),
          entitiesErrors: new Map(),
          unprocessableEntitiesIds: new Set([
            "2df173ee-6b88-4744-a74d-0f21d49166b3",
          ]),
        },
        builder,
      ),
    ).toMatchSnapshot();

    expect(
      computeUnprocessableEntities(
        schema,
        {
          entitiesValues: new Map([
            ["51324b32-adc3-4d17-a90e-66b5453935bd", "process"],
            ["6e0035c3-0d4c-445f-a42b-2d971225447c", "process"],
            ["2df173ee-6b88-4744-a74d-0f21d49166b3", "process"],
          ]),
          entitiesErrors: new Map(),
          unprocessableEntitiesIds: new Set([
            "2df173ee-6b88-4744-a74d-0f21d49166b3",
            "6e0035c3-0d4c-445f-a42b-2d971225447c",
          ]),
        },
        builder,
      ),
    ).toMatchSnapshot();
  });
});
