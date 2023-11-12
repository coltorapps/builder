import { useId } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ValidationError } from "@/components/ui/validation-error";
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
    const schema = z.string();

    if (context.entity.attributes.required) {
      return schema.min(1).parse(value);
    }

    return schema.optional().parse(value);
  },
});

export const SelectFieldEntity = createEntityComponent(
  selectFieldEntity,
  (props) => {
    const id = useId();

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
          <SelectTrigger
            ref={(inputElement) => {
              if (inputElement && Boolean(props.entity.error)) {
                inputElement.focus();
              }
            }}
            id={id}
          >
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
        <ValidationError error={props.entity.error} />
      </div>
    );
  },
);
