"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation } from "@/lib/navigation";
import clsx from "clsx";

function ArrowIcon(props: React.ComponentPropsWithoutRef<"svg">) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="m9.182 13.423-1.17-1.16 3.505-3.505H3V7.065h8.517l-3.506-3.5L9.181 2.4l5.512 5.511-5.511 5.512Z" />
    </svg>
  );
}

function PageLink({
  title,
  href,
  dir = "next",
  ...props
}: Omit<React.ComponentPropsWithoutRef<"div">, "dir" | "title"> & {
  title: string;
  href: string;
  dir?: "previous" | "next";
}) {
  return (
    <div {...props}>
      <dt className="font-display text-sm font-medium text-neutral-900 dark:text-white">
        {dir === "next" ? "Next" : "Previous"}
      </dt>
      <dd className="mt-1">
        <Link
          href={href}
          className={clsx(
            "flex items-center gap-x-1 text-base font-semibold text-neutral-500 hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-300",
            dir === "previous" && "flex-row-reverse",
          )}
        >
          {title}
          <ArrowIcon
            className={clsx(
              "h-4 w-4 flex-none fill-current",
              dir === "previous" && "-scale-x-100",
            )}
          />
        </Link>
      </dd>
    </div>
  );
}

export function PrevNextLinks() {
  const pathname = usePathname();
  const allLinks = navigation.flatMap((section) => section.links);
  const linkIndex = allLinks.findIndex((link) => link.href === pathname);
  const previousPage = linkIndex > -1 ? allLinks[linkIndex - 1] : null;
  const nextPage = linkIndex > -1 ? allLinks[linkIndex + 1] : null;

  if (!nextPage && !previousPage) {
    return null;
  }

  return (
    <dl className="mt-12 flex border-t border-neutral-200 pt-6 dark:border-neutral-800">
      {previousPage && <PageLink dir="previous" {...previousPage} />}
      {nextPage && <PageLink className="ml-auto text-right" {...nextPage} />}
    </dl>
  );
}
