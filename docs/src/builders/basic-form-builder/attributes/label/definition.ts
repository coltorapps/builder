import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const labelAttribute = createAttribute({
  validate(value) {
    return z.string().min(1).max(255).parse(value);
  },
});

export type LabelAttribute = typeof labelAttribute;
