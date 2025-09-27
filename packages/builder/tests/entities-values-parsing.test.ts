import { describe } from "node:test";
import { it } from "vitest";
import { z } from "zod";

import { createAttributeDefinition } from "../src/attribute-definition";
import { createBuilder } from "../src/builder";
import { parseEntitiesValues } from "../src/entities-values-parsing";
import { createEntityDefinition } from "../src/entity-definition";
import { validateSchema } from "../src/schema-validation";

describe("test", () => {
  it("test", () => {
    const builder = createBuilder({
      entities: {
        textField: createEntityDefinition({
          parse(value) {
            return z.string().safeParse(value);
          },
          attributes: {
            label: createAttributeDefinition({
              parse: (value) => {
                return z.string().safeParse(value);
              },
            }),
          },
          shouldBeProcessed: (ctx) => ctx.entity.id === "textField2",
        }),
      },
      validateEntityId: (id) => typeof id === "string",
    });

    const schema = {
      entities: {
        textField: { type: "textField", attributes: { label: 'a' } },
        textField2: { type: "textField", attributes: { label: 'a' } },
      },
      root: ["textField", "textField2"],
    } as const;

    const result = parseEntitiesValues({ textField2: "2" }, schema, builder);

    console.log(JSON.stringify(result, null, 2));
  });
});
