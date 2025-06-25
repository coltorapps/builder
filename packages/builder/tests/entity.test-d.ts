import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { createAttribute, type Attribute } from "../src/attribute";
import {
  createEntity,
  type AttributeExtension,
  type ContextEntityEntry,
  type Entity,
  type EntityContext,
} from "../src/entity";
import { type Schema } from "../src/schema";

describe("entity", () => {
  it("can be created", () => {
    const entity = createEntity();

    expectTypeOf(entity).toMatchTypeOf<
      Entity<Record<never, never>, unknown, false>
    >();
  });

  it("can be created with validator", () => {
    const entity = createEntity({
      validate(value) {
        return z.string().parse(value);
      },
    });

    type Context = {
      entity: ContextEntityEntry;
      entities: Record<string, ContextEntityEntry>;
      schema: Schema;
    };

    expectTypeOf(entity).toEqualTypeOf<{
      attributes: Record<string, Attribute<unknown>>;
      valueAllowed: true;
      childrenAllowed: boolean;
      parentRequired: boolean;
      attributesExtensions: Record<string, AttributeExtension>;
      validate: (value: unknown, context: Context) => string;
      defaultValue: (context: Context) => string | undefined;
      shouldBeProcessed: (context: Context) => boolean;
      metadata: unknown;
    }>();
  });

  it("can be created with attributes", () => {
    const entity = createEntity({
      validate(value) {
        return z.string().parse(value);
      },
      childrenAllowed: true,
      parentRequired: true,
      attributes: {
        label: createAttribute({
          validate(value) {
            return z.string().parse(value);
          },
        }),
        defaultValue: createAttribute({
          validate(value) {
            return z.string().optional().parse(value);
          },
        }),
      },
      metadata: "test" as const,
    });

    type Attributes = {
      readonly label: Attribute<string>;
      readonly defaultValue: Attribute<string | undefined>;
    };

    type Context = EntityContext<
      Entity<
        {
          readonly label: Attribute<string>;
          readonly defaultValue: Attribute<string | undefined>;
        },
        unknown,
        boolean,
        "test"
      >
    >;

    expectTypeOf(entity).toEqualTypeOf<{
      attributes: Attributes;
      attributesExtensions: Record<string, AttributeExtension>;
      valueAllowed: true;
      childrenAllowed: boolean;
      parentRequired: boolean;
      metadata: "test";
      validate: (value: unknown, context: Context) => string;
      defaultValue: (context: Context) => string | undefined;
      shouldBeProcessed: (context: Context) => boolean;
    }>();
  });
});
