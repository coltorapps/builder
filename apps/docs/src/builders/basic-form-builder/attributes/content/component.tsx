import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { useRefWithErrorFocus } from "@/lib/error-focus";
import { cn } from "@/lib/utils";
import { Bold, Italic } from "lucide-react";

import { createAttributeComponent } from "@basebuilder/react";

import { contentAttribute } from "./definition";

export const ContentAttribute = createAttributeComponent(
  contentAttribute,
  function ContentAttribute(props) {
    const inputRef = useRefWithErrorFocus<HTMLTextAreaElement>(
      props.attribute.error,
    );

    return (
      <div>
        <Label htmlFor={props.attribute.name} aria-required>
          Content
        </Label>
        <div className="relative">
          <div className="absolute flex h-8 w-full items-center justify-end gap-2 border-b px-1">
            <Toggle
              pressed={props.attribute.value.italic}
              size="xs"
              aria-label="Toggle italic"
              onPressedChange={(pressed) =>
                props.setValue({ ...props.attribute.value, italic: pressed })
              }
            >
              <Italic className="h-4 w-4" />
            </Toggle>
            <Toggle
              pressed={props.attribute.value.bold}
              size="xs"
              aria-label="Toggle bold"
              onPressedChange={(pressed) =>
                props.setValue({ ...props.attribute.value, bold: pressed })
              }
            >
              <Bold className="h-4 w-4" />
            </Toggle>
          </div>
          <Textarea
            ref={inputRef}
            className={cn("pt-10", {
              "font-semibold": props.attribute.value.bold,
              italic: props.attribute.value.italic,
            })}
            id={props.attribute.name}
            name={props.attribute.name}
            value={props.attribute.value.text ?? ""}
            onChange={(e) => {
              props.setValue({
                ...props.attribute.value,
                text: e.target.value,
              });

              void props.validate();
            }}
            required
            rows={10}
            autoFocus
          />
        </div>
        <ValidationError>
          {
            formatError(props.attribute.value, props.attribute.error)?.text
              ?._errors?.[0]
          }
        </ValidationError>
      </div>
    );
  },
);
