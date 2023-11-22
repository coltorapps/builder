import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { useRefWithErrorFocus } from "@/lib/error-focus";

import { createEntityComponent } from "@basebuilder/react";

import { textareaFieldEntity } from "./definition";

export const TextareaFieldEntity = createEntityComponent(
  textareaFieldEntity,
  function TextareaFieldEntity(props) {
    const id = useId();

    const inputRef = useRefWithErrorFocus<HTMLTextAreaElement>(
      props.entity.error,
    );

    return (
      <div>
        <Label htmlFor={id} aria-required={props.entity.attributes.required}>
          {props.entity.attributes.label.trim()
            ? props.entity.attributes.label
            : "Label"}
        </Label>
        <Textarea
          id={id}
          ref={inputRef}
          name={props.entity.id}
          value={props.entity.value ?? ""}
          onChange={(e) => props.setValue(e.target.value)}
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
