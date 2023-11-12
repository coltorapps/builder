import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ValidationError } from "@/components/ui/validation-error";
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
                    autoFocus
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
                <ValidationError
                  error={props.attribute.error}
                  fieldKey={index.toString()}
                />
              </div>
            ))}
          </div>
        ) : null}
        <div>
          <ValidationError error={props.attribute.error} />
        </div>
        <Button
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
