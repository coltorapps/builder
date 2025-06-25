import { type BuilderEntityComponentProps } from "@coltorapps/builder-react";

import { ContentAttribute } from "../../attributes/content/component";
import { type ParagraphEntity } from "./definition";

export function ParagraphAttributes(
  props: BuilderEntityComponentProps<ParagraphEntity>,
) {
  return <ContentAttribute attribute={props.entity.attributes.content} />;
}
