import { type BuilderEntityComponentProps } from "@coltorapps/builder-react";

import { LabelAttribute } from "../../attributes/label/component";
import { OptionsAttribute } from "../../attributes/options/component";
import { PlaceholderAttribute } from "../../attributes/placeholder/component";
import { RequiredAttribute } from "../../attributes/required/component";
import { type SelectFieldEntity } from "./definition";

export function SelectFieldAttributes(
  props: BuilderEntityComponentProps<SelectFieldEntity>,
) {
  return (
    <>
      <LabelAttribute attribute={props.entity.attributes.label} />
      <PlaceholderAttribute attribute={props.entity.attributes.placeholder} />
      <RequiredAttribute attribute={props.entity.attributes.required} />
      <OptionsAttribute attribute={props.entity.attributes.options} />
    </>
  );
}
