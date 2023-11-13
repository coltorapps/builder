import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { useRefWithErrorFocus } from "@/lib/error-focus";
import { createEntity } from "basebuilder";
import { z } from "zod";

import { createEntityComponent } from "@basebuilder/react";

import { defaultStringValueAttribute } from "../attributes/default-string-value-attribute";
import { labelAttribute } from "../attributes/label-attribute";
import { placeholderAttribute } from "../attributes/placeholder-attribute";
import { requiredAttribute } from "../attributes/required-attribute";

export const textFieldEntity = createEntity({
  name: "textField",
  attributes: [
    labelAttribute,
    placeholderAttribute,
    defaultStringValueAttribute,
    requiredAttribute,
  ],
  validate(value, context) {
    const schema = z.string().max(255);

    if (context.entity.attributes.required) {
      return schema.min(1).parse(value);
    }

    return schema.optional().parse(value);
  },
  defaultValue(context) {
    return context.entity.attributes.defaultValue;
  },
});

export const TextFieldEntity = createEntityComponent(
  textFieldEntity,
  (props) => {
    const id = useId();

    const inputRef = useRefWithErrorFocus<HTMLInputElement>(props.entity.error);

    return (
      <div>
        <Label htmlFor={id} aria-required={props.entity.attributes.required}>
          {props.entity.attributes.label.trim()
            ? props.entity.attributes.label
            : "Label"}
        </Label>
        <Input
          ref={inputRef}
          id={id}
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
        <ValidationError>
          {formatError(props.entity.value, props.entity.error)?._errors?.[0]}
        </ValidationError>
      </div>
    );
  },
);
