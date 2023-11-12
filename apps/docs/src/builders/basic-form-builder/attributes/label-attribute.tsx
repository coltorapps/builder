import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ValidationError } from "@/components/ui/validation-error";
import { createAttribute } from "basebuilder";
import { z } from "zod";

import { createAttributeComponent } from "@basebuilder/react";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    return z.string().min(1).max(255).parse(value);
  },
});

export const LabelAttribute = createAttributeComponent(
  labelAttribute,
  (props) => {
    return (
      <div>
        <Label htmlFor={props.attribute.name} aria-required>
          Label
        </Label>
        <Input
          id={props.attribute.name}
          name={props.attribute.name}
          value={props.attribute.value ?? ""}
          onChange={(e) => {
            props.setValue(e.target.value);

            void props.validate();
          }}
          required
          autoFocus
        />
        <ValidationError error={props.attribute.error} />
      </div>
    );
  },
);
