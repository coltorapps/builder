import { type BuilderEntityComponentProps } from "@coltorapps/builder-react";

import { DefaultDateValueAttribute } from "../../attributes/default-date-value/component";
import { LabelAttribute } from "../../attributes/label/component";
import { RequiredAttribute } from "../../attributes/required/component";
import { type DatePickerFieldEntity } from "./definition";

export function DatePickerFieldAttributes(
  props: BuilderEntityComponentProps<DatePickerFieldEntity>,
) {
  return (
    <>
      <LabelAttribute attribute={props.entity.attributes.label} />
      <RequiredAttribute attribute={props.entity.attributes.required} />
      <DefaultDateValueAttribute
        attribute={props.entity.attributes.defaultValue}
      />
    </>
  );
}
