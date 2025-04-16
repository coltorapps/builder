import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { createAttribute, type Attribute } from "../src/attribute";
import {
  createEntity,
  type AttributesExtensions,
  type Entity,
  type EntityContext,
} from "../src/entity";

describe("entity", () => {
  it("can be created", () => {
    const entity = createEntity({});

    // eslint-disable-next-line @typescript-eslint/ban-types
    expectTypeOf(entity).toMatchTypeOf<{}>();
  });

  it("can be created with validator", () => {
    const entity = createEntity({
      validate(value) {
        return z.string().parse(value);
      },
    });

    type EntityContext = {
      entity: {
        id: string;
        attributes: {
          [x: string]: unknown;
        };
        children?: Array<string>;
        parentId?: string;
      };
      entitiesValues: {
        [x: string]: unknown;
      };
    };

    expectTypeOf(entity).toEqualTypeOf<{
      attributes: Record<string, Attribute>;
      valueAllowed: boolean;
      childrenAllowed: false;
      parentRequired: false;
      attributesExtensions: AttributesExtensions<
        Entity<Record<string, Attribute>, unknown, boolean, boolean>
      >;
      validate: (value: unknown, context: EntityContext) => string;
      defaultValue: (context: EntityContext) => string | undefined;
      shouldBeProcessed: (context: EntityContext) => boolean;
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
      defaultValue({ entity }) {
        return entity.attributes.defaultValue;
      },
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
        boolean
      >
    >;

    expectTypeOf(entity).toEqualTypeOf<{
      attributes: Attributes;
      attributesExtensions: AttributesExtensions<
        Entity<
          {
            readonly label: Attribute<string>;
            readonly defaultValue: Attribute<string | undefined>;
          },
          unknown,
          boolean,
          boolean
        >
      >;
      valueAllowed: boolean;
      childrenAllowed: true;
      parentRequired: true;
      validate: (value: unknown, context: Context) => string;
      defaultValue: (context: Context) => string | undefined;
      shouldBeProcessed: (context: Context) => boolean;
    }>();
  });
});
