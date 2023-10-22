import { describe, expectTypeOf, it } from "vitest";

import {
  createBuilder,
  createEntity,
  type Attribute,
  type Entity,
} from "../src";

describe("builder", () => {
  it("can be created with minimal options", () => {
    const builder = createBuilder({ entities: [] });

    expectTypeOf(builder).toEqualTypeOf<{
      entities: readonly [];
      entityId: {
        generate: () => string;
        validate: (id: string) => void;
      };
      childrenAllowed: {
        [x: string]: never;
      };
      parentRequired: [];
    }>();
  });

  it("can be created with entities", () => {
    const builder = createBuilder({
      entities: [createEntity({ name: "test" })],
      childrenAllowed: {
        test: true,
      },
      parentRequired: ["test"],
    });

    expectTypeOf(builder).toEqualTypeOf<{
      entities: readonly [Entity<"test", readonly Attribute[], unknown>];
      entityId: {
        generate: () => string;
        validate: (id: string) => void;
      };
      childrenAllowed: {
        readonly test: true;
      };
      parentRequired: readonly ["test"];
    }>();
  });
});
