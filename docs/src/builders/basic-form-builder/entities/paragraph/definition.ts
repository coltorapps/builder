import { createEntity } from "@coltorapps/builder";

import { contentAttribute } from "../../attributes/content/definition";

export const paragraphEntity = createEntity({
  attributes: {
    content: contentAttribute,
  },
});

export type ParagraphEntity = typeof paragraphEntity;
