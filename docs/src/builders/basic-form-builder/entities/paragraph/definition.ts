import { createEntity } from "@coltorapps/builder";

import { contentAttribute } from "../../attributes/content/definition";

export const paragraphEntity = createEntity({
  name: "paragraph",
  attributes: [contentAttribute],
});
