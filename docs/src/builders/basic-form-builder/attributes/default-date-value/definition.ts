import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const defaultDateValueAttribute = createAttribute({
  validate(value) {
    return z.coerce.date().optional().parse(value);
  },
});

export type DefaultDateValueAttribute = typeof defaultDateValueAttribute;
