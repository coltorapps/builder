import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const optionsAttribute = createAttribute({
  validate(value) {
    return z.array(z.string().min(1)).min(1).parse(value);
  },
});

export type OptionsAttribute = typeof optionsAttribute;
