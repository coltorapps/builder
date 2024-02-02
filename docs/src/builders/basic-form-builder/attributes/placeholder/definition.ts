import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const placeholderAttribute = createAttribute({
  name: "placeholder",
  validate(value) {
    return z.string().max(255).optional().parse(value);
  },
});
