"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { z } from "zod";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const customErrorMap: z.ZodErrorMap = (issue, ctx) => {
      if (
        issue.code === z.ZodIssueCode.invalid_type ||
        (issue.code === z.ZodIssueCode.too_small && issue.type === "string") ||
        issue.code === z.ZodIssueCode.invalid_date
      ) {
        return { message: "This field is required" };
      }

      if (
        issue.code === z.ZodIssueCode.too_small &&
        issue.type === "array" &&
        issue.minimum === 1
      ) {
        return { message: "Add at least 1 item" };
      }

      return { message: ctx.defaultError };
    };

    z.setErrorMap(customErrorMap);
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      forcedTheme="dark"
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
