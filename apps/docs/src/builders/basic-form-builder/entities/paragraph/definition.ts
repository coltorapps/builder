import { createEntity } from "basebuilder";

import { contentAttribute } from "../../attributes/content/definition";

export const paragraphEntity = createEntity({
  name: "paragraph",
  attributes: [contentAttribute],
});
