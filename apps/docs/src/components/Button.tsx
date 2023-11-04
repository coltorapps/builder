import Link from "next/link";
import clsx from "clsx";

const variantStyles = {
  primary:
    "rounded-full bg-neutral-300 py-2 px-4 text-sm font-semibold text-neutral-900 hover:bg-neutral-200 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-300/50 active:bg-neutral-500",
  secondary:
    "rounded-full bg-neutral-800 py-2 px-4 text-sm font-medium text-white hover:bg-neutral-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 active:text-neutral-400",
};

type ButtonProps = {
  variant?: keyof typeof variantStyles;
} & (
  | React.ComponentPropsWithoutRef<typeof Link>
  | (React.ComponentPropsWithoutRef<"button"> & { href?: undefined })
);

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  className = clsx(variantStyles[variant], className);

  return typeof props.href === "undefined" ? (
    <button className={className} {...props} />
  ) : (
    <Link className={className} {...props} />
  );
}
