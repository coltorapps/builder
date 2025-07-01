import { forwardRef, useId } from "react";
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

import {
  type EntityAttributesValues,
  type EntityValue,
} from "@coltorapps/builder";
import {
  useEntityAttributesValues,
  useEntityError,
  useEntityValue,
  type BuilderEntityComponentProps,
  type InterpreterEntityComponentProps,
} from "@coltorapps/builder-react";

import { type DatePickerFieldEntity } from "./definition";

interface DatePickerFieldProps
  extends EntityAttributesValues<DatePickerFieldEntity> {
  id: string;
  value?: EntityValue<DatePickerFieldEntity>;
  onChange?: (value: EntityValue<DatePickerFieldEntity>) => void;
}

const DatePickerField = forwardRef<HTMLButtonElement, DatePickerFieldProps>(
  function DatePickerField(props, ref) {
    const parsedValue = props.value ? new Date(props.value) : undefined;

    return (
      <div>
        <Label htmlFor={props.id} aria-required={props.required}>
          {props.label.trim() ? props.label : "Label"}
        </Label>
        <Popover modal>
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              id={props.id}
              variant={"outline"}
              className={cn(
                "w-full justify-start rounded-md text-left font-normal",
                !parsedValue && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {parsedValue ? (
                format(parsedValue, "PPP")
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={parsedValue}
              onSelect={(value) => props.onChange?.(value?.toString())}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  },
);

export function BuilderDatePickerFieldEntity(
  props: BuilderEntityComponentProps<DatePickerFieldEntity>,
) {
  const attributes = useEntityAttributesValues(props.entity);

  return <DatePickerField id={props.entity.id} {...attributes} />;
}

export function InterpreterDatePickerFieldEntity(
  props: InterpreterEntityComponentProps<DatePickerFieldEntity>,
) {
  const id = useId();

  const value = useEntityValue(props.entity);

  const error = useEntityError(props.entity);

  const buttonRef = useRefWithErrorFocus<HTMLButtonElement>(error);

  return (
    <div>
      <DatePickerField
        ref={buttonRef}
        id={id}
        value={value}
        onChange={(value) => props.entity.setValue(value)}
        {...props.entity.attributes}
      />
      <ValidationError>
        {formatError(value, error)?._errors?.[0]}
      </ValidationError>
    </div>
  );
}
