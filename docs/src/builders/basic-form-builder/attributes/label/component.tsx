import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { useRefWithErrorFocus } from "@/lib/error-focus";

import {
  useAttributeError,
  useAttributeValue,
  type AttributeInstance,
} from "@coltorapps/builder-react";

import { type LabelAttribute } from "./definition";

export function LabelAttribute(props: {
  attribute: AttributeInstance<LabelAttribute>;
}) {
  const value = useAttributeValue(props.attribute);

  const error = useAttributeError(props.attribute);

  const inputRef = useRefWithErrorFocus<HTMLInputElement>(error);

  return (
    <div>
      <Label htmlFor={props.attribute.type} aria-required>
        Label
      </Label>
      <Input
        ref={inputRef}
        id={props.attribute.type}
        name={props.attribute.type}
        value={value ?? ""}
        onChange={(e) => {
          props.attribute.setValue(e.target.value);
        }}
        required
      />
      <ValidationError>
        {formatError(value, error)?._errors?.[0]}
      </ValidationError>
    </div>
  );
}
