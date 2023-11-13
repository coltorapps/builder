import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { useRefWithErrorFocus } from "@/lib/error-focus";
import { createAttribute } from "basebuilder";
import { XIcon } from "lucide-react";
import { z } from "zod";

import { createAttributeComponent } from "@basebuilder/react";

export const optionsAttribute = createAttribute({
  name: "options",
  validate(value) {
    return z.array(z.string().min(1)).min(1).parse(value);
  },
});

export const OptionsAttribute = createAttributeComponent(
  optionsAttribute,
  (props) => {
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

                      void props.validate();
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

                      void props.validate();
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
              void props.validate();
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
