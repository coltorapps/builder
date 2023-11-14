import { createEntity } from "basebuilder";
import { z } from "zod";

import { defaultDateValueAttribute } from "../../attributes/default-date-value/definition";
import { labelAttribute } from "../../attributes/label/definition";
import { requiredAttribute } from "../../attributes/required/definition";

export const datePickerFieldEntity = createEntity({
  name: "datePickerField",
  attributes: [labelAttribute, defaultDateValueAttribute, requiredAttribute],
  validate(value, context) {
    const schema = z.coerce.date();

    if (context.entity.attributes.required) {
      return schema.parse(value);
    }

    return schema.optional().parse(value);
  },
  defaultValue(context) {
    return context.entity.attributes.defaultValue;
  },
});
