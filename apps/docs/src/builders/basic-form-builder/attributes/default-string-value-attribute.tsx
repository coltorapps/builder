import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ValidationError } from "@/components/ui/validation-error";
import { createAttribute } from "basebuilder";
import { z } from "zod";

import { createAttributeComponent } from "@basebuilder/react";

export const defaultStringValueAttribute = createAttribute({
  name: "defaultValue",
  validate(value) {
    return z.string().max(255).optional().parse(value);
  },
});

export const DefaultStringValueAttribute = createAttributeComponent(
  defaultStringValueAttribute,
  (props) => {
    console.log("render default");

    return (
      <div>
        <Label htmlFor={props.attribute.name}>Default Value</Label>
        <Input
          id={props.attribute.name}
          name={props.attribute.name}
          value={props.attribute.value ?? ""}
          onChange={(e) => {
            props.setValue(e.target.value);

            void props.validate();
          }}
        />
        <ValidationError error={props.attribute.error} />
      </div>
    );
  },
);
