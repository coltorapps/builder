import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { useRefWithErrorFocus } from "@/lib/error-focus";
import { XIcon } from "lucide-react";

import { createAttributeComponent } from "@basebuilder/react";

import { optionsAttribute } from "./definition";

export const OptionsAttribute = createAttributeComponent(
  optionsAttribute,
  function OptionsAttribute(props) {
    const attributeError = formatError(
      props.attribute.value,
      props.attribute.error,
    )?._errors?.[0];

    const buttonRef = useRefWithErrorFocus<HTMLButtonElement>(attributeError);

    return (
      <div>
        <div>
          <Label aria-required>Options</Label>
        </div>
        {props.attribute.value.length ? (
          <div className="mb-4 grid gap-3">
            {props.attribute.value.map((option, index) => (
              <div key={index}>
                <div className="flex items-center space-x-2">
                  <Input
                    name={`${props.attribute.name}-options-${index}`}
                    value={option ?? ""}
                    onChange={(e) => {
                      props.setValue(
                        props.attribute.value.map((item, itemIndex) =>
                          itemIndex === index ? e.target.value : item,
                        ),
                      );
                    }}
                    autoFocus={!option}
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    className="rounded-md"
                    onClick={() => {
                      props.setValue(
                        props.attribute.value.filter(
                          (_item, itemIndex) => itemIndex !== index,
                        ),
                      );
                    }}
                  >
                    <XIcon className="w-3" />
                  </Button>
                </div>
                <ValidationError>
                  {
                    formatError(props.attribute.value, props.attribute.error)?.[
                      `${index}`
                    ]?._errors?.[0]
                  }
                </ValidationError>
              </div>
            ))}
          </div>
        ) : null}
        <div>
          <ValidationError>{attributeError}</ValidationError>
        </div>
        <Button
          ref={buttonRef}
          size="sm"
          onClick={() => {
            props.setValue([...props.attribute.value, ""]);

            if (props.attribute.error) {
            }
          }}
          variant="outline"
        >
          Add option
        </Button>
      </div>
    );
  },
);
