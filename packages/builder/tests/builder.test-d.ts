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
    const builder = createBuilder({ entities: {} });

    type SchemaForValidation = Schema<
      // eslint-disable-next-line @typescript-eslint/ban-types
      Builder<{}>
    >;

    expectTypeOf(builder).toEqualTypeOf<{
      // eslint-disable-next-line @typescript-eslint/ban-types
      entities: {};
      generateEntityId: () => string;
      validateEntityId: (id: string) => void;
      validateSchema: (
        schema: SchemaForValidation,
      ) => SchemaForValidation | Promise<SchemaForValidation>;
      // eslint-disable-next-line @typescript-eslint/ban-types
      entitiesExtensions: EntitiesExtensions<{}>;
    }>();
  });

  it("can be created with entities", () => {
    const builder = createBuilder({
      entities: {
        test: createEntity({
          attributes: {
            label: createAttribute({
              validate() {
                return "string";
              },
            }),
          },
          childrenAllowed: true,
          parentRequired: true,
        }),
      },
    });

    type Entities = {
      readonly test: Entity<
        {
          readonly label: Attribute<string>;
        },
        unknown,
        true,
        true
      >;
    };

    type BuilderSchema = Schema<Builder<Entities>>;

    expectTypeOf(builder).toEqualTypeOf<{
      entities: Entities;
      generateEntityId: () => string;
      validateEntityId: (id: string) => void;
      validateSchema: (
        schema: BuilderSchema,
      ) => Promise<BuilderSchema> | BuilderSchema;
      entitiesExtensions: EntitiesExtensions<Entities>;
    }>();
  });
});
