import { forwardRef, useId } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

import { type TextareaFieldEntity } from "./definition";

interface TextareaFieldProps
  extends EntityAttributesValues<TextareaFieldEntity> {
  id: string;
  value?: EntityValue<TextareaFieldEntity>;
  onChange?: (value: EntityValue<TextareaFieldEntity>) => void;
}

const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  function TextField(props, ref) {
    return (
      <div>
        <Label htmlFor={props.id} aria-required={props.required}>
          {props.label.trim() ? props.label : "Label"}
        </Label>
        <Textarea
          ref={ref}
          id={props.id}
          name={props.id}
          value={props.value ?? ""}
          onChange={(e) => props.onChange?.(e.target.value)}
          placeholder={props.placeholder}
          required={props.required}
          defaultValue={props.defaultValue}
        />
      </div>
    );
  },
);

export function BuilderTextareaFieldEntity(
  props: BuilderEntityComponentProps<TextareaFieldEntity>,
) {
  const attributes = useEntityAttributesValues(props.entity);

  return <TextareaField id={props.entity.id} {...attributes} />;
}

export function InterpreterTextareaFieldEntity(
  props: InterpreterEntityComponentProps<TextareaFieldEntity>,
) {
  const id = useId();

  const value = useEntityValue(props.entity);

  const error = useEntityError(props.entity);

  const inputRef = useRefWithErrorFocus<HTMLTextAreaElement>(error);

  return (
    <div>
      <TextareaField
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
