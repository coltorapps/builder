import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const requiredAttribute = createAttribute({
  validate(value) {
    return z.boolean().optional().parse(value);
  },
});

export type RequiredAttribute = typeof requiredAttribute;
