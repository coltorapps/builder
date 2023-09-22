import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  createBuilder,
  createEntity,
  createInput,
  createSchemaStore,
} from "../src";
import { createInputsValidationStore } from "../src/inputs-validation-store";

describe("inputs validation store", () => {
  it("can be created", () => {
    const builder = createBuilder({
      entities: [],
    });

    const schemaStore = createSchemaStore({ builder });

    const inputsValidationStore = createInputsValidationStore({
      schemaStore,
    });

    expect(inputsValidationStore).toMatchSnapshot();
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

    const schemaStore = createSchemaStore({
      builder,
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

    const inputsValidationStore = createInputsValidationStore({
      schemaStore,
    });

    await expect(
      inputsValidationStore.validateEntityInput(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "label",
      ),
    ).resolves.toEqual(undefined);

    await expect(
      inputsValidationStore.validateEntityInput(
        "51324b32-adc3-4d17-a90e-66b5453935bd",
        "label",
      ),
    ).resolves.toEqual(undefined);

    expect(inputsValidationStore.getData()).toMatchSnapshot();

    await expect(
      inputsValidationStore.validateEntityInput("invalid", "label"),
    ).rejects.toThrowErrorMatchingSnapshot();

    await expect(
      inputsValidationStore.validateEntityInput(
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

    const schemaStore = createSchemaStore({
      builder,
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

    const inputsValidationStore = createInputsValidationStore({
      schemaStore,
    });

    await inputsValidationStore.validateEntityInputs(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
    );

    expect(inputsValidationStore.getData()).toMatchSnapshot();

    await expect(
      inputsValidationStore.validateEntityInputs("invalid"),
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

    const schemaStore = createSchemaStore({
      builder,
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

    const inputsValidationStore = createInputsValidationStore({
      schemaStore,
    });

    await inputsValidationStore.validateEntitiesInputs(),
      expect(inputsValidationStore.getData()).toMatchSnapshot();
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

    const schemaStore = createSchemaStore({
      builder,
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

    const inputsValidationStore = createInputsValidationStore({
      schemaStore,
    });

    expect(
      inputsValidationStore.setEntityInputError(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "label",
        "Some error",
      ),
    ).toEqual(undefined);

    expect(
      inputsValidationStore.setEntityInputError(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "title",
        "Title error",
      ),
    ).toEqual(undefined);

    expect(inputsValidationStore.getData()).toMatchSnapshot();

    expect(() =>
      inputsValidationStore.setEntityInputError("invalid", "title", "error"),
    ).toThrowErrorMatchingSnapshot();

    expect(() =>
      inputsValidationStore.setEntityInputError(
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

    const schemaStore = createSchemaStore({
      builder,
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

    const inputsValidationStore = createInputsValidationStore({
      schemaStore,
    });

    expect(
      inputsValidationStore.setEntityInputsErrors(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        {
          label: "some error",
          title: "another error",
        },
      ),
    ).toEqual(undefined);

    expect(inputsValidationStore.getData()).toMatchSnapshot();

    expect(() =>
      inputsValidationStore.setEntityInputError("invalid", "title", "error"),
    ).toThrowErrorMatchingSnapshot();

    expect(() =>
      inputsValidationStore.setEntityInputsErrors(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        {
          // @ts-expect-error Intentional wrong data type
          invalid: "some error",
        },
      ),
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

    const schemaStore = createSchemaStore({
      builder,
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

    const inputsValidationStore = createInputsValidationStore({
      schemaStore,
    });

    expect(
      inputsValidationStore.setEntitiesInputsErrors({
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

    expect(inputsValidationStore.getData()).toMatchSnapshot();

    expect(() =>
      inputsValidationStore.setEntitiesInputsErrors({
        invalid: {},
      }),
    ).toThrowErrorMatchingSnapshot();

    expect(() =>
      inputsValidationStore.setEntitiesInputsErrors({
        "6e0035c3-0d4c-445f-a42b-2d971225447c": {
          // @ts-expect-error Intentional wrong data type
          invalid: "some error",
        },
      }),
    ).toThrowErrorMatchingSnapshot();

    inputsValidationStore.setEntitiesInputsErrors({});

    expect(inputsValidationStore.getData()).toMatchSnapshot();
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

    const schemaStore = createSchemaStore({
      builder,
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

    const inputsValidationStore = createInputsValidationStore({
      schemaStore,
    });

    inputsValidationStore.setEntityInputsErrors(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
      {
        label: "label error",
        title: "title error",
      },
    );

    expect(inputsValidationStore.getData()).toMatchSnapshot();

    expect(
      inputsValidationStore.resetEntityInputError(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
        "label",
      ),
    ).toEqual(undefined);

    expect(inputsValidationStore.getData()).toMatchSnapshot();

    expect(() =>
      inputsValidationStore.resetEntityInputError("invalid", "title"),
    ).toThrowErrorMatchingSnapshot();

    expect(() =>
      inputsValidationStore.resetEntityInputError(
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

    const schemaStore = createSchemaStore({
      builder,
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

    const inputsValidationStore = createInputsValidationStore({
      schemaStore,
    });

    inputsValidationStore.setEntityInputsErrors(
      "6e0035c3-0d4c-445f-a42b-2d971225447c",
      {
        label: "label error",
        title: "title error",
      },
    );

    expect(inputsValidationStore.getData()).toMatchSnapshot();

    expect(
      inputsValidationStore.resetEntityInputsErrors(
        "6e0035c3-0d4c-445f-a42b-2d971225447c",
      ),
    ).toEqual(undefined);

    expect(inputsValidationStore.getData()).toMatchSnapshot();

    expect(() =>
      inputsValidationStore.resetEntityInputsErrors("invalid"),
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

    const schemaStore = createSchemaStore({
      builder,
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

    const inputsValidationStore = createInputsValidationStore({
      schemaStore,
    });

    inputsValidationStore.setEntitiesInputsErrors({
      "6e0035c3-0d4c-445f-a42b-2d971225447c": {
        label: "label error",
      },
      "51324b32-adc3-4d17-a90e-66b5453935bd": {
        title: "title error",
      },
    });

    expect(inputsValidationStore.getData()).toMatchSnapshot();

    expect(inputsValidationStore.resetEntitiesInputsErrors()).toEqual(
      undefined,
    );

    expect(inputsValidationStore.getData()).toMatchSnapshot();
  });
});
