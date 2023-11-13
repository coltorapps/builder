import React from "react";
import { cn } from "@/lib/utils";
import { ZodError, type ZodFormattedError } from "zod";

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export function formatError<TValue>(
  _value: TValue,
  error: unknown,
): DeepPartial<ZodFormattedError<TValue>> | null {
  if (!error) {
    return null;
  }

  if (!(error instanceof ZodError)) {
    return new ZodError([
      { message: "Something went wrong", path: [], code: "custom" },
    ]).format() as DeepPartial<ZodFormattedError<TValue>>;
  }

  return (error as ZodError<TValue>).format() as DeepPartial<
    ZodFormattedError<TValue>
  >;
}

export const ValidationError = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  if (!children) {
    return null;
  }

  return (
    <span
      ref={ref}
      className={cn("text-xs text-red-500", className)}
      {...props}
    >
      {children}
    </span>
  );
});

ValidationError.displayName = "ValidationError";
