import { createAttribute } from "basebuilder";
import { z } from "zod";

export const optionsAttribute = createAttribute({
  name: "options",
  validate(value) {
    return z.array(z.string().min(1)).min(1).parse(value);
  },
});
