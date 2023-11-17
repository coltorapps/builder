import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { useRefWithErrorFocus } from "@/lib/error-focus";

import { createAttributeComponent } from "@basebuilder/react";

import { labelAttribute } from "./definition";

export const LabelAttribute = createAttributeComponent(
  labelAttribute,
  function LabelAttribute(props) {
    const inputRef = useRefWithErrorFocus<HTMLInputElement>(
      props.attribute.error,
    );

    return (
      <div>
        <Label htmlFor={props.attribute.name} aria-required>
          Label
        </Label>
        <Input
          ref={inputRef}
          id={props.attribute.name}
          name={props.attribute.name}
          value={props.attribute.value ?? ""}
          onChange={(e) => {
            props.setValue(e.target.value);

            void props.validate();
          }}
          required
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
