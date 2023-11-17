import { createAttribute } from "basebuilder";
import { z } from "zod";

export const defaultStringValueAttribute = createAttribute({
  name: "defaultValue",
  validate(value) {
    return z.string().max(255).optional().parse(value);
  },
});
