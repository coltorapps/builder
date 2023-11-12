import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ValidationError } from "@/components/ui/validation-error";
import { cn } from "@/lib/utils";
import { createEntity } from "basebuilder";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { z } from "zod";

import { createEntityComponent } from "@basebuilder/react";

import { defaultDateValueAttribute } from "../attributes/default-date-value-attribute";
import { labelAttribute } from "../attributes/label-attribute";
import { requiredAttribute } from "../attributes/required-attribute";

export const datePickerFieldEntity = createEntity({
  name: "datePickerField",
  attributes: [labelAttribute, defaultDateValueAttribute, requiredAttribute],
  validate(value, context) {
    const schema = z.coerce.date();

    if (context.entity.attributes.required) {
      return schema.parse(value);
    }

    return schema.optional().parse(value);
  },
  defaultValue(context) {
    return context.entity.attributes.defaultValue;
  },
});

export const DatePickerFieldEntity = createEntityComponent(
  datePickerFieldEntity,
  (props) => {
    const id = useId();

    return (
      <div>
        <Label htmlFor={id} aria-required={props.entity.attributes.required}>
          {props.entity.attributes.label.trim()
            ? props.entity.attributes.label
            : "Label"}
        </Label>
        <Popover modal>
          <PopoverTrigger asChild>
            <Button
              ref={(inputElement) => {
                if (inputElement && Boolean(props.entity.error)) {
                  inputElement?.focus();
                }
              }}
              id={id}
              variant={"outline"}
              className={cn(
                "w-full justify-start rounded-md text-left font-normal",
                !props.entity.value && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {props.entity.value ? (
                format(props.entity.value, "PPP")
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={props.entity.value}
              onSelect={(value) => {
                props.setValue(value);

                void props.validate();
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <ValidationError error={props.entity.error} />
      </div>
    );
  },
);
