import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { useRefWithErrorFocus } from "@/lib/error-focus";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { createEntityComponent } from "@basebuilder/react";

import { datePickerFieldEntity } from "./definition";

export const DatePickerFieldEntity = createEntityComponent(
  datePickerFieldEntity,
  function DatePickerFieldEntity(props) {
    const id = useId();

    const buttonRef = useRefWithErrorFocus<HTMLButtonElement>(
      props.entity.error,
    );

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
              ref={buttonRef}
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
              onSelect={props.setValue}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <ValidationError>
          {formatError(props.entity.value, props.entity.error)?._errors?.[0]}
        </ValidationError>
      </div>
    );
  },
);
