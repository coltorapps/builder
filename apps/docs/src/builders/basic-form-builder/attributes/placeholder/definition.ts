import { createAttribute } from "basebuilder";
import { z } from "zod";

export const placeholderAttribute = createAttribute({
  name: "placeholder",
  validate(value) {
    return z.string().max(255).optional().parse(value);
  },
});
