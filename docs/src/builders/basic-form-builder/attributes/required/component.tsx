import { Checkbox } from "@/components/ui/checkbox";
import { formatError, ValidationError } from "@/components/ui/validation-error";

import {
  useAttributeError,
  useAttributeValue,
  type AttributeInstance,
} from "@coltorapps/builder-react";

import { type RequiredAttribute } from "./definition";

export function RequiredAttribute(props: {
  attribute: AttributeInstance<RequiredAttribute>;
}) {
  const value = useAttributeValue(props.attribute);

  const error = useAttributeError(props.attribute);

  return (
    <div>
      <div className="items-top flex space-x-2">
        <Checkbox
          id={props.attribute.name}
          checked={value}
          onCheckedChange={(checked) => {
            if (typeof checked === "boolean") {
              props.attribute.setValue(checked);
            }
          }}
        />
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor={props.attribute.name}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Mandatory Field
          </label>
        </div>
      </div>
      <ValidationError>
        {formatError(value, error)?._errors?.[0]}
      </ValidationError>
    </div>
  );
}
