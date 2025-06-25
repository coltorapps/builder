import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const placeholderAttribute = createAttribute({
  validate(value) {
    return z.string().max(255).optional().parse(value);
  },
});

export type PlaceholderAttribute = typeof placeholderAttribute;
