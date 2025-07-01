import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const defaultDateValueAttribute = createAttribute({
  validate(value) {
    return z
      .string()
      .refine((val) => !isNaN(Date.parse(val)))
      .optional()
      .parse(value);
  },
});

export type DefaultDateValueAttribute = typeof defaultDateValueAttribute;
