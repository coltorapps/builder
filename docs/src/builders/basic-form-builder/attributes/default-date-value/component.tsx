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

import {
  useAttributeError,
  useAttributeValue,
  type AttributeInstance,
} from "@coltorapps/builder-react";

import { type DefaultDateValueAttribute } from "./definition";

export function DefaultDateValueAttribute(props: {
  attribute: AttributeInstance<DefaultDateValueAttribute>;
}) {
  const value = useAttributeValue(props.attribute);

  const error = useAttributeError(props.attribute);

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
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(value) => {
              props.attribute.setValue(value);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <ValidationError>
        {formatError(value, error)?._errors?.[0]}
      </ValidationError>
    </div>
  );
}
