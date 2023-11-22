import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";

import { createAttributeComponent } from "@basebuilder/react";

import { defaultStringValueAttribute } from "./definition";

export const DefaultStringValueAttribute = createAttributeComponent(
  defaultStringValueAttribute,
  function DefaultStringValueAttribute(props) {
    return (
      <div>
        <Label htmlFor={props.attribute.name}>Default Value</Label>
        <Input
          id={props.attribute.name}
          name={props.attribute.name}
          value={props.attribute.value ?? ""}
          onChange={(e) => {
            props.setValue(e.target.value);
          }}
        />
        <ValidationError>
          {
            formatError(props.attribute.value, props.attribute.error)
              ?._errors?.[0]
          }
        </ValidationError>
      </div>
    );
  },
);
