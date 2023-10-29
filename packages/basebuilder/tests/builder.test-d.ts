import { describe, expectTypeOf, it } from "vitest";

import {
  createAttribute,
  createBuilder,
  createEntity,
  type Attribute,
  type Builder,
  type Entity,
  type Schema,
} from "../src";
import { type EntitiesExtensions } from "../src/builder";

describe("builder", () => {
  it("can be created with minimal options", () => {
    const builder = createBuilder({ entities: [] });

    expectTypeOf(builder).toEqualTypeOf<{
      entities: readonly [];
      generateEntityId: () => string;
      validateEntityId: (id: string) => void;
      parentRequired: [];
      validateSchema: (
        schema: Schema<Builder<readonly [], [], object>>,
      ) =>
        | Schema<Builder<readonly [], [], object>>
        | Promise<Schema<Builder<readonly [], [], object>>>;
      entitiesExtensions: EntitiesExtensions<readonly []>;
    }>();
  });

  it("can be created with entities", () => {
    const builder = createBuilder({
      entities: [
        createEntity({
          name: "test",
          attributes: [
            createAttribute({
              name: "label",
              validate() {
                return "string";
              },
            }),
          ],
          childrenAllowed: true,
        }),
      ],
      parentRequired: ["test"],
    });

    type BuilderSchema = Schema<
      Builder<
        readonly [
          Entity<"test", readonly [Attribute<"label", string>], unknown, true>,
        ],
        readonly ["test"]
      >
    >;

    expectTypeOf(builder).toEqualTypeOf<{
      entities: readonly [
        Entity<"test", readonly [Attribute<"label", string>], unknown, true>,
      ];
      generateEntityId: () => string;
      validateEntityId: (id: string) => void;

      parentRequired: readonly ["test"];
      validateSchema: (
        schema: BuilderSchema,
      ) => Promise<BuilderSchema> | BuilderSchema;
      entitiesExtensions: EntitiesExtensions<
        readonly [
          Entity<"test", readonly [Attribute<"label", string>], unknown>,
        ]
      >;
    }>();
  });
});
