import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { createAttributeComponent } from "@basebuilder/react";

import { defaultDateValueAttribute } from "./definition";

export const DefaultDateValueAttribute = createAttributeComponent(
  defaultDateValueAttribute,
  function DefaultDateValueAttribute(props) {
    return (
      <div>
        <Label htmlFor={props.attribute.name}>Default Value</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id={props.attribute.name}
              variant={"outline"}
              className={cn(
                "w-full justify-start rounded-md text-left font-normal",
                !props.attribute.value && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {props.attribute.value ? (
                format(props.attribute.value, "PPP")
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={props.attribute.value}
              onSelect={(value) => {
                props.setValue(value);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <ValidationError>
          {
            formatError(props.attribute.value, props.attribute.error)
              ?._errors?.[0]
          }
        </ValidationError>
      </div>
    );
  },
);
