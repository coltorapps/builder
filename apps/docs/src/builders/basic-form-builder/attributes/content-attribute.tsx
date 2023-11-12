import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ValidationError } from "@/components/ui/validation-error";
import { createAttribute } from "basebuilder";
import { z } from "zod";

import { createAttributeComponent } from "@basebuilder/react";

export const contentAttribute = createAttribute({
  name: "content",
  validate(value) {
    return z.string().min(1).max(1000).parse(value);
  },
});

export const ContentAttribute = createAttributeComponent(
  contentAttribute,
  (props) => {
    return (
      <div>
        <Label htmlFor={props.attribute.name} aria-required>
          Content
        </Label>
        <Textarea
          id={props.attribute.name}
          name={props.attribute.name}
          value={props.attribute.value ?? ""}
          onChange={(e) => {
            props.setValue(e.target.value);

            void props.validate();
          }}
          required
          rows={10}
          autoFocus
        />
        <ValidationError error={props.attribute.error} />
      </div>
    );
  },
);
