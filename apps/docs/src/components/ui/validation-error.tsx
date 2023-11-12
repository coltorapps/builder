import React from "react";
import { cn } from "@/lib/utils";
import { ZodError } from "zod";

export const ValidationError = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {
    error?: unknown;
    fieldKey?: string;
  }
>(({ className, children, error, fieldKey, ...props }, ref) => {
  function getBody() {
    if (!(error instanceof ZodError)) {
      return children;
    }

    if (!fieldKey) {
      return error?.flatten().formErrors[0];
    }

    return error?.flatten().fieldErrors[fieldKey];
  }

  const body = getBody();

  if (!body) {
    return null;
  }

  return (
    <span
      ref={ref}
      className={cn("text-xs text-red-500", className)}
      {...props}
    >
      {body}
    </span>
  );
});

ValidationError.displayName = "ValidationError";
