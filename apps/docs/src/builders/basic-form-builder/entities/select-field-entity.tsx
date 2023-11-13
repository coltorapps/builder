import { useId } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { useRefWithErrorFocus } from "@/lib/error-focus";
import { createEntity } from "basebuilder";
import { z } from "zod";

import { createEntityComponent } from "@basebuilder/react";

import { labelAttribute } from "../attributes/label-attribute";
import { optionsAttribute } from "../attributes/options-attribute";
import { placeholderAttribute } from "../attributes/placeholder-attribute";
import { requiredAttribute } from "../attributes/required-attribute";

export const selectFieldEntity = createEntity({
  name: "selectField",
  attributes: [
    labelAttribute,
    placeholderAttribute,
    requiredAttribute,
    optionsAttribute,
  ],
  validate(value, context) {
    const schema = z.enum(
      context.entity.attributes.options as [string, ...string[]],
    );

    if (context.entity.attributes.required) {
      return schema.parse(value);
    }

    return schema.optional().parse(value);
  },
});

export const SelectFieldEntity = createEntityComponent(
  selectFieldEntity,
  (props) => {
    const id = useId();

    const buttonRef = useRefWithErrorFocus<HTMLButtonElement>(
      props.entity.error,
    );

    return (
      <div>
        <Label htmlFor={id} aria-required={props.entity.attributes.required}>
          {props.entity.attributes.label.trim()
            ? props.entity.attributes.label
            : "Label"}
        </Label>
        <Select
          value={props.entity.value ?? ""}
          required={props.entity.attributes.required}
          onValueChange={(value) => {
            props.setValue(value);

            void props.validate();
          }}
        >
          <SelectTrigger ref={buttonRef} id={id}>
            <SelectValue
              placeholder={
                props.entity.attributes.placeholder?.trim()
                  ? props.entity.attributes.placeholder
                  : "Select"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {props.entity.attributes.options.map((option, index) => (
              <SelectItem key={index} value={option || " "}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ValidationError>
          {formatError(props.entity.value, props.entity.error)?._errors?.[0]}
        </ValidationError>
      </div>
    );
  },
);
