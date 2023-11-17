import { createAttribute } from "basebuilder";
import { z } from "zod";

export const requiredAttribute = createAttribute({
  name: "required",
  validate(value) {
    return z.boolean().optional().parse(value);
  },
});
