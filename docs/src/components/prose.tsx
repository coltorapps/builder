import clsx, { type ClassValue } from "clsx";

export function Prose<T extends React.ElementType = "div">({
  as,
  className,
  ...props
}: React.ComponentPropsWithoutRef<T> & {
  as?: T;
  className?: ClassValue;
}) {
  const Component = as ?? "div";

  return (
    <Component
      className={clsx(
        className,
        "prose prose-slate dark:prose-invert max-w-none dark:text-neutral-400",
        // headings
        "prose-headings:scroll-mt-28 prose-headings:font-display prose-headings:font-normal lg:prose-headings:scroll-mt-[8.5rem]",
        // lead
        "prose-lead:text-neutral-500 dark:prose-lead:text-neutral-400",
        // links
        "prose-a:font-semibold dark:prose-a:text-neutral-300",
        // link underline
        "dark:hover:prose-a:text-sky-300 dark:[--tw-prose-background:theme(colors.slate.900)]",
        // pre
        "prose-pre:rounded-xl prose-pre:bg-neutral-900 prose-pre:shadow-lg dark:prose-pre:bg-neutral-800/60 dark:prose-pre:shadow-none dark:prose-pre:ring-1 dark:prose-pre:ring-neutral-300/10",
        // hr
        "dark:prose-hr:border-neutral-800",
        // tables
        "dark:prose-th:border-b dark:prose-td:border-t",
      )}
      {...props}
    />
  );
}
