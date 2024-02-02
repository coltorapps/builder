import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const defaultDateValueAttribute = createAttribute({
  name: "defaultValue",
  validate(value) {
    return z.coerce.date().optional().parse(value);
  },
});
