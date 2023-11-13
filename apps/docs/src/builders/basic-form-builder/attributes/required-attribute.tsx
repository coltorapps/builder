import { Checkbox } from "@/components/ui/checkbox";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { createAttribute } from "basebuilder";
import { z } from "zod";

import { createAttributeComponent } from "@basebuilder/react";

export const requiredAttribute = createAttribute({
  name: "required",
  validate(value) {
    return z.boolean().optional().parse(value);
  },
});

export const RequiredAttribute = createAttributeComponent(
  requiredAttribute,
  (props) => {
    return (
      <div>
        <div className="items-top flex space-x-2">
          <Checkbox
            id={props.attribute.name}
            checked={props.attribute.value}
            onCheckedChange={(checked) => {
              if (typeof checked === "boolean") {
                props.setValue(checked);

                void props.validate();
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
          {
            formatError(props.attribute.value, props.attribute.error)
              ?._errors?.[0]
          }
        </ValidationError>
      </div>
    );
  },
);
