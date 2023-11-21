import { createEntity } from "basebuilder";
import { z } from "zod";

import { defaultStringValueAttribute } from "../../attributes/default-string-value/definition";
import { labelAttribute } from "../../attributes/label/definition";
import { placeholderAttribute } from "../../attributes/placeholder/definition";
import { requiredAttribute } from "../../attributes/required/definition";

export const textFieldEntity = createEntity({
  name: "textField",
  attributes: [
    labelAttribute,
    placeholderAttribute,
    defaultStringValueAttribute,
    requiredAttribute,
  ],
  validate(value, context) {
    const schema = z.string().max(255);

    if (context.entity.attributes.required) {
      return schema.min(1).parse(value);
    }

    return schema.optional().parse(value);
  },
  defaultValue(context) {
    return context.entity.attributes.defaultValue;
  },
  shouldBeProcessed(context) {
    if (context.entity.id === "a68836dc-1478-435f-bdee-ca7aff098993") {
      return true;
    }

    return (
      context.entitiesValues["a68836dc-1478-435f-bdee-ca7aff098993"] === "o"
    );
  },
});
