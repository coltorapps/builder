import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { createAttribute, type Schema, type SchemaEntityWithId } from "../src";

describe("attribute", () => {
  it("can be created", () => {
    const attribute = createAttribute({
      validate(value) {
        return z.string().parse(value);
      },
    });
    interface ContextEntity extends SchemaEntityWithId {
      metadata: unknown;
    }

    expectTypeOf(attribute).toEqualTypeOf<{
      validate: (
        value: unknown,
        context: {
          schema: Schema;
          entity: ContextEntity;
        },
      ) => string;
    }>();
  });
});
