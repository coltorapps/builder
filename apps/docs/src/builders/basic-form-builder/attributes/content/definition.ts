import { createAttribute } from "basebuilder";
import { z } from "zod";

export const contentAttribute = createAttribute({
  name: "content",
  validate(value) {
    return z
      .object({
        text: z.string().min(1).max(1000),
        bold: z.boolean().optional(),
        italic: z.boolean().optional(),
      })
      .parse(value);
  },
});
