import { createEntity } from "basebuilder";
import { z } from "zod";

import { labelAttribute } from "../../attributes/label/definition";
import { optionsAttribute } from "../../attributes/options/definition";
import { placeholderAttribute } from "../../attributes/placeholder/definition";
import { requiredAttribute } from "../../attributes/required/definition";

export const selectFieldEntity = createEntity({
  name: "selectField",
  attributes: [
    labelAttribute,
    placeholderAttribute,
    requiredAttribute,
    optionsAttribute,
  ],
  validate(value, context) {
    const schema = z.enum(
      context.entity.attributes.options as [string, ...string[]],
    );

    if (context.entity.attributes.required) {
      return schema.parse(value);
    }

    return schema.optional().parse(value);
  },
});
