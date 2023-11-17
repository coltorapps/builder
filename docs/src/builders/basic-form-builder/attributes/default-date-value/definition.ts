import { createAttribute } from "basebuilder";
import { z } from "zod";

export const defaultDateValueAttribute = createAttribute({
  name: "defaultValue",
  validate(value) {
    return z.coerce.date().optional().parse(value);
  },
});
