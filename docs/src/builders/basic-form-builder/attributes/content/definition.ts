import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

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
