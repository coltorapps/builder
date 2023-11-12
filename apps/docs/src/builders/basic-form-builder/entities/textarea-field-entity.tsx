import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ValidationError } from "@/components/ui/validation-error";
import { createEntity } from "basebuilder";
import { z } from "zod";

import { createEntityComponent } from "@basebuilder/react";

import { defaultStringValueAttribute } from "../attributes/default-string-value-attribute";
import { labelAttribute } from "../attributes/label-attribute";
import { placeholderAttribute } from "../attributes/placeholder-attribute";
import { requiredAttribute } from "../attributes/required-attribute";

export const textareaFieldEntity = createEntity({
  name: "textareaField",
  attributes: [
    labelAttribute,
    placeholderAttribute,
    defaultStringValueAttribute,
    requiredAttribute,
  ],
  validate(value, context) {
    const schema = z.string().max(1000);

    if (context.entity.attributes.required) {
      return schema.min(1).parse(value);
    }

    return schema.optional().parse(value);
  },
  defaultValue(context) {
    return context.entity.attributes.defaultValue;
  },
});

export const TextareaFieldEntity = createEntityComponent(
  textareaFieldEntity,
  (props) => {
    const id = useId();

    return (
      <div>
        <Label htmlFor={id} aria-required={props.entity.attributes.required}>
          {props.entity.attributes.label.trim()
            ? props.entity.attributes.label
            : "Label"}
        </Label>
        <Textarea
          id={id}
          ref={(inputElement) => {
            if (inputElement && Boolean(props.entity.error)) {
              inputElement.focus();
            }
          }}
          name={props.entity.id}
          value={props.entity.value ?? ""}
          onChange={(e) => {
            props.setValue(e.target.value);

            void props.validate();
          }}
          defaultValue={props.entity.attributes.defaultValue}
          placeholder={props.entity.attributes.placeholder}
          required={props.entity.attributes.required}
        />
        <ValidationError error={props.entity.error} />
      </div>
    );
  },
);
