import { forwardRef, useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

import { type TextFieldEntity } from "./definition";

interface TextFieldProps extends EntityAttributesValues<TextFieldEntity> {
  id: string;
  value?: EntityValue<TextFieldEntity>;
  onChange?: (value: EntityValue<TextFieldEntity>) => void;
}

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(props, ref) {
    return (
      <div>
        <Label htmlFor={props.id} aria-required={props.required}>
          {props.label.trim() ? props.label : "Label"}
        </Label>
        <Input
          ref={ref}
          id={props.id}
          name={props.id}
          value={props.value ?? ""}
          onChange={(e) => props.onChange?.(e.target.value)}
          placeholder={props.placeholder}
          required={props.required}
        />
      </div>
    );
  },
);

export function BuilderTextFieldEntity(
  props: BuilderEntityComponentProps<TextFieldEntity>,
) {
  const attributes = useEntityAttributesValues(props.entity);

  return <TextField id={props.entity.id} {...attributes} />;
}

export function InterpreterTextFieldEntity(
  props: InterpreterEntityComponentProps<TextFieldEntity>,
) {
  const id = useId();

  const value = useEntityValue(props.entity);

  const error = useEntityError(props.entity);

  const inputRef = useRefWithErrorFocus<HTMLInputElement>(error);

  return (
    <div>
      <TextField
        ref={inputRef}
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
