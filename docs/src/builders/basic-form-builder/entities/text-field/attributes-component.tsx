import { DefaultStringValueAttribute } from "../../attributes/default-string-value/component";
import { LabelAttribute } from "../../attributes/label/component";
import { PlaceholderAttribute } from "../../attributes/placeholder/component";
import { RequiredAttribute } from "../../attributes/required/component";

export function TextFieldAttributes() {
  return (
    <>
      <LabelAttribute />
      <DefaultStringValueAttribute />
      <PlaceholderAttribute />
      <RequiredAttribute />
    </>
  );
}
