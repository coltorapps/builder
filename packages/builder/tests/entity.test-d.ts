import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { createEntity } from "../src/entity";
import { createInput, type Input } from "../src/input";

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
      entity: {
        id: string;
        inputs: {
          [x: string]: unknown;
        };
      };
      entitiesValues: {
        [x: string]: unknown;
      };
    };

    expectTypeOf(entity).toEqualTypeOf<{
      name: "text";
      inputs: readonly Input[];
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
      defaultValue({ entity }) {
        return entity.inputs.defaultValue;
      },
    });

    type EntityContext = {
      entity: {
        id: string;
        inputs: { label: string; defaultValue: string | undefined };
      };
      entitiesValues: Record<string, unknown>;
    };

    expectTypeOf(entity).toEqualTypeOf<{
      name: "text";
      inputs: readonly [
        Input<"label", string>,
        Input<"defaultValue", string | undefined>,
      ];
      isValueAllowed: boolean;
      validate: (value: unknown, context: EntityContext) => string;
      defaultValue: (context: EntityContext) => string | undefined;
      shouldBeProcessed: (context: EntityContext) => boolean;
    }>();
  });
});
