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
import { type EntityExtension } from "../src/builder";

describe("builder", () => {
  it("can be created with minimal options", () => {
    const builder = createBuilder({ entities: {} });

    type SchemaForValidation = Schema<Builder<Record<never, Entity>>>;

    expectTypeOf(builder).toEqualTypeOf<{
      entities: Record<never, Entity>;
      generateEntityId: () => string;
      validateEntityId: (id: string) => void;
      validateSchema: (
        schema: SchemaForValidation,
      ) => SchemaForValidation | Promise<SchemaForValidation>;
      entitiesExtensions: Record<string, EntityExtension>;
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
        false
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
      entitiesExtensions: Record<string, EntityExtension>;
    }>();
  });
});
