import { forwardRef, useId } from "react";
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

import {
  type EntityAttributesValues,
  type EntityValue,
} from "@coltorapps/builder";
import {
  useEntityAttributesValues,
  useEntityError,
  useEntityValue,
  type BuilderEntityComponentProps,
  type InterpreterEntityComponentProps,
} from "@coltorapps/builder-react";

import { type SelectFieldEntity } from "./definition";

interface SelectFieldProps extends EntityAttributesValues<SelectFieldEntity> {
  id: string;
  value?: EntityValue<SelectFieldEntity>;
  onChange?: (value: EntityValue<SelectFieldEntity>) => void;
}

const SelectField = forwardRef<HTMLButtonElement, SelectFieldProps>(
  function TextField(props, ref) {
    return (
      <div>
        <Label htmlFor={props.id} aria-required={props.required}>
          {props.label.trim() ? props.label : "Label"}
        </Label>
        <Select
          value={props.value ?? ""}
          required={props.required}
          onValueChange={props.onChange}
        >
          <SelectTrigger ref={ref} id={props.id}>
            <SelectValue
              placeholder={
                props.placeholder?.trim() ? props.placeholder : "Select"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {props.options.map((option, index) => (
              <SelectItem key={index} value={option || " "}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  },
);

export function BuilderSelectFieldEntity(
  props: BuilderEntityComponentProps<SelectFieldEntity>,
) {
  const attributes = useEntityAttributesValues(props.entity);

  return <SelectField id={props.entity.id} {...attributes} />;
}

export function InterpreterSelectFieldEntity(
  props: InterpreterEntityComponentProps<SelectFieldEntity>,
) {
  const id = useId();

  const value = useEntityValue(props.entity);

  const error = useEntityError(props.entity);

  const buttonRef = useRefWithErrorFocus<HTMLButtonElement>(error);

  return (
    <div>
      <SelectField
        ref={buttonRef}
        id={id}
        value={value}
        onChange={(value) => props.entity.setValue(value)}
        {...props.entity.attributes}
      />
      <ValidationError>
        {formatError(value, error)?._errors?.[0]}
      </ValidationError>
    </div>
  );
}
