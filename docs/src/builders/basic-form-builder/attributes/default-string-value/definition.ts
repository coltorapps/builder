import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const defaultStringValueAttribute = createAttribute({
  name: "defaultValue",
  validate(value) {
    return z.string().max(255).optional().parse(value);
  },
});
