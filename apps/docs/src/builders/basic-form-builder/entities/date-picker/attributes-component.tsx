import { DefaultDateValueAttribute } from "../../attributes/default-date-value/component";
import { LabelAttribute } from "../../attributes/label/component";
import { RequiredAttribute } from "../../attributes/required/component";

export function DatePickerFieldAttributes() {
  return (
    <>
      <LabelAttribute />
      <RequiredAttribute />
      <DefaultDateValueAttribute />
    </>
  );
}
