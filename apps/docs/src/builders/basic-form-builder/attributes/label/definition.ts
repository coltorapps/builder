import { createAttribute } from "basebuilder";
import { z } from "zod";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    return z.string().min(1).max(255).parse(value);
  },
});
