"use client";

import { usePathname } from "next/navigation";
import { navigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import clsx from "clsx";

export function DocsHeader({ title }: { title?: string }) {
  const pathname = usePathname();
  const section = navigation.find((section) =>
    section.links.find((link) => link.href === pathname),
  );

  if (!title && !section) {
    return null;
  }

  return (
    <header className={clsx("space-y-1", pathname === "/" ? "mb-1" : "mb-9")}>
      {section && (
        <p className="font-display text-sm font-medium text-neutral-500">
          {section.title}
        </p>
      )}
      {title && (
        <h1
          className={cn(
            "font-display text-3xl tracking-tight text-neutral-900 dark:text-white",
            {
              "break-all": pathname.startsWith("/docs/api/"),
            },
          )}
        >
          {title}
        </h1>
      )}
    </header>
  );
}
