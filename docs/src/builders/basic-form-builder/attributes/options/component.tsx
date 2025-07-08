import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { useRefWithErrorFocus } from "@/lib/error-focus";
import { XIcon } from "lucide-react";

import {
  useAttributeError,
  useAttributeValue,
  type AttributeInstance,
} from "@coltorapps/builder-react";

import { type OptionsAttribute } from "./definition";

export function OptionsAttribute(props: {
  attribute: AttributeInstance<OptionsAttribute>;
}) {
  const value = useAttributeValue(props.attribute);

  const error = useAttributeError(props.attribute);

  const attributeError = formatError(value, error)?._errors?.[0];

  const buttonRef = useRefWithErrorFocus<HTMLButtonElement>(attributeError);

  return (
    <div>
      <div>
        <Label aria-required>Options</Label>
      </div>
      {value.length ? (
        <div className="mb-4 grid gap-3">
          {value.map((option, index) => (
            <div key={index}>
              <div className="flex items-center space-x-2">
                <Input
                  name={`${props.attribute.type}-options-${index}`}
                  value={option ?? ""}
                  onChange={(e) => {
                    props.attribute.setValue(
                      value.map((item, itemIndex) =>
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
                    props.attribute.setValue(
                      value.filter((_item, itemIndex) => itemIndex !== index),
                    );
                  }}
                >
                  <XIcon className="w-3" />
                </Button>
              </div>
              <ValidationError>
                {formatError(value, error)?.[`${index}`]?._errors?.[0]}
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
          props.attribute.setValue([...value, ""]);
        }}
        variant="outline"
      >
        Add option
      </Button>
    </div>
  );
}
