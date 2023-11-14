import { LabelAttribute } from "../../attributes/label/component";
import { OptionsAttribute } from "../../attributes/options/component";
import { PlaceholderAttribute } from "../../attributes/placeholder/component";
import { RequiredAttribute } from "../../attributes/required/component";

export function SelectFieldAttributes() {
  return (
    <>
      <LabelAttribute />
      <PlaceholderAttribute />
      <RequiredAttribute />
      <OptionsAttribute />
    </>
  );
}
