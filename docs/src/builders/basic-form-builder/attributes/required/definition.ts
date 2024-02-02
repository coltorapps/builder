import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const requiredAttribute = createAttribute({
  name: "required",
  validate(value) {
    return z.boolean().optional().parse(value);
  },
});
