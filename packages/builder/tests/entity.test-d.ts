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
      values: Record<string, unknown>;
    };

    expectTypeOf(entity).toEqualTypeOf<{
      name: "text";
      inputs: ReadonlyArray<{
        name: string;
        validate: (value: unknown) => unknown;
        defaultValue: () => unknown;
      }>;
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
      values: Record<string, unknown>;
    };

    expectTypeOf(entity).toEqualTypeOf<{
      name: "text";
      inputs: readonly [
        {
          name: "label";
          validate: (value: unknown) => string;
          defaultValue: () => string | undefined;
        },
        {
          name: "defaultValue";
          validate: (value: unknown) => string | undefined;
          defaultValue: () => string | undefined;
        },
      ];
      isValueAllowed: boolean;
      validate: (value: unknown, context: EntityContext) => string;
      defaultValue: (context: EntityContext) => string | undefined;
      shouldBeProcessed: (context: EntityContext) => boolean;
    }>();
  });
});
