import { type BuilderEntityComponentProps } from "@coltorapps/builder-react";

import { DefaultStringValueAttribute } from "../../attributes/default-string-value/component";
import { LabelAttribute } from "../../attributes/label/component";
import { PlaceholderAttribute } from "../../attributes/placeholder/component";
import { RequiredAttribute } from "../../attributes/required/component";
import { type textareaFieldEntity } from "./definition";

export function TextareaFieldAttributes(
  props: BuilderEntityComponentProps<typeof textareaFieldEntity>,
) {
  return (
    <>
      <LabelAttribute attribute={props.entity.attributes.label} />
      <DefaultStringValueAttribute
        attribute={props.entity.attributes.defaultValue}
      />
      <PlaceholderAttribute attribute={props.entity.attributes.placeholder} />
      <RequiredAttribute attribute={props.entity.attributes.required} />
    </>
  );
}
