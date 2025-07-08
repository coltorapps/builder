import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { useRefWithErrorFocus } from "@/lib/error-focus";
import { cn } from "@/lib/utils";
import { Bold, Italic } from "lucide-react";

import {
  useAttributeError,
  useAttributeValue,
  type AttributeInstance,
} from "@coltorapps/builder-react";

import { type ContentAttribute } from "./definition";

export function ContentAttribute(props: {
  attribute: AttributeInstance<ContentAttribute>;
}) {
  const value = useAttributeValue(props.attribute);

  const error = useAttributeError(props.attribute);

  const inputRef = useRefWithErrorFocus<HTMLTextAreaElement>(error);

  return (
    <div>
      <Label htmlFor={props.attribute.type} aria-required>
        Content
      </Label>
      <div className="relative">
        <div className="absolute flex h-8 w-full items-center justify-end gap-2 border-b px-1">
          <Toggle
            pressed={value.italic}
            size="xs"
            aria-label="Toggle italic"
            onPressedChange={(pressed) =>
              props.attribute.setValue({ ...value, italic: pressed })
            }
          >
            <Italic className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={value.bold}
            size="xs"
            aria-label="Toggle bold"
            onPressedChange={(pressed) =>
              props.attribute.setValue({ ...value, bold: pressed })
            }
          >
            <Bold className="h-4 w-4" />
          </Toggle>
        </div>
        <Textarea
          ref={inputRef}
          className={cn("pt-10", {
            "font-semibold": value.bold,
            italic: value.italic,
          })}
          id={props.attribute.type}
          name={props.attribute.type}
          value={value.text ?? ""}
          onChange={(e) => {
            props.attribute.setValue({
              ...value,
              text: e.target.value,
            });
          }}
          required
          rows={10}
          autoFocus
        />
      </div>
      <ValidationError>
        {formatError(value, error)?.text?._errors?.[0]}
      </ValidationError>
    </div>
  );
}
