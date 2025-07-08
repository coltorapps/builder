import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";

import {
  useAttributeError,
  useAttributeValue,
  type AttributeInstance,
} from "@coltorapps/builder-react";

import { type PlaceholderAttribute } from "./definition";

export function PlaceholderAttribute(props: {
  attribute: AttributeInstance<PlaceholderAttribute>;
}) {
  const value = useAttributeValue(props.attribute);

  const error = useAttributeError(props.attribute);

  return (
    <div>
      <Label htmlFor={props.attribute.type}>Placeholder</Label>
      <Input
        id={props.attribute.type}
        name={props.attribute.type}
        value={value ?? ""}
        onChange={(e) => {
          props.attribute.setValue(e.target.value);
        }}
      />
      <ValidationError>
        {formatError(value, error)?._errors?.[0]}
      </ValidationError>
    </div>
  );
}
