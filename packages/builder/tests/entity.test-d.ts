import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { createEntity } from "../src/entity";
import { createInput } from "../src/input";

describe("entity", () => {
  it("can be created", () => {
    const entity = createEntity({
      name: "text",
    });

    expectTypeOf(entity).toMatchTypeOf<{
      name: "text";
    }>();
  });

  it("can be created with validator", () => {
    const entity = createEntity({
      name: "text",
      validate(value) {
        return z.string().parse(value);
      },
    });

    type EntityContext = {
      inputs: {
        [x: string]: unknown;
      };
      meta: NonNullable<unknown>;
      values: Record<string, unknown>;
    };

    expectTypeOf(entity).toEqualTypeOf<{
      name: "text";
      inputs: ReadonlyArray<{
        name: string;
        validate: (value: unknown, context: { meta: unknown }) => unknown;
        defaultValue: (context: { meta: unknown }) => unknown;
        meta: unknown;
      }>;
      meta: NonNullable<unknown>;
      isValueAllowed: boolean;
      validate: (value: unknown, context: EntityContext) => string;
      defaultValue: (context: EntityContext) => string | undefined;
      shouldBeProcessed: (context: EntityContext) => boolean;
    }>();
  });

  it("can be created with meta", () => {
    const entity = createEntity({
      name: "text",
      validate(value) {
        return z.string().parse(value);
      },
      meta: "test",
    });

    type EntityContext = {
      inputs: {
        [x: string]: unknown;
      };
      meta: "test";
      values: Record<string, unknown>;
    };

    expectTypeOf(entity).toEqualTypeOf<{
      name: "text";
      inputs: ReadonlyArray<{
        name: string;
        validate: (value: unknown, context: { meta: unknown }) => unknown;
        defaultValue: (context: { meta: unknown }) => unknown;
        meta: unknown;
      }>;
      meta: "test";
      isValueAllowed: boolean;
      validate: (value: unknown, context: EntityContext) => string;
      defaultValue: (context: EntityContext) => string | undefined;
      shouldBeProcessed: (context: EntityContext) => boolean;
    }>();
  });

  it("can be created with inputs", () => {
    const entity = createEntity({
      name: "text",
      validate(value) {
        return z.string().parse(value);
      },
      inputs: [
        createInput({
          name: "label",
          validate(value) {
            return z.string().parse(value);
          },
        }),
        createInput({
          name: "defaultValue",
          validate(value) {
            return z.string().optional().parse(value);
          },
        }),
      ],
      defaultValue({ inputs }) {
        return inputs.defaultValue;
      },
    });

    type EntityContext = {
      inputs: { label: string; defaultValue: string | undefined };
      meta: NonNullable<unknown>;
      values: Record<string, unknown>;
    };

    type InputContext = {
      meta: unknown;
    };

    expectTypeOf(entity).toEqualTypeOf<{
      name: "text";
      inputs: readonly [
        {
          name: "label";
          validate: (value: unknown, context: InputContext) => string;
          defaultValue: (context: InputContext) => string | undefined;
          meta: unknown;
        },
        {
          name: "defaultValue";
          validate: (
            value: unknown,
            context: InputContext,
          ) => string | undefined;
          defaultValue: (context: InputContext) => string | undefined;
          meta: unknown;
        },
      ];
      meta: NonNullable<unknown>;
      isValueAllowed: boolean;
      validate: (value: unknown, context: EntityContext) => string;
      defaultValue: (context: EntityContext) => string | undefined;
      shouldBeProcessed: (context: EntityContext) => boolean;
    }>();
  });
});
