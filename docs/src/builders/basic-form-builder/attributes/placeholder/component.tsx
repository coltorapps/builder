import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";

import { createAttributeComponent } from "@basebuilder/react";

import { placeholderAttribute } from "./definition";

export const PlaceholderAttribute = createAttributeComponent(
  placeholderAttribute,
  function PlaceholderAttribute(props) {
    return (
      <div>
        <Label htmlFor={props.attribute.name}>Placeholder</Label>
        <Input
          id={props.attribute.name}
          name={props.attribute.name}
          value={props.attribute.value ?? ""}
          onChange={(e) => {
            props.setValue(e.target.value);

            void props.validate();
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
