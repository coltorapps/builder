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

import { createEntityComponent } from "@basebuilder/react";

import { selectFieldEntity } from "./definition";

export const SelectFieldEntity = createEntityComponent(
  selectFieldEntity,
  function SelectFieldEntity(props) {
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
          onValueChange={props.setValue}
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
