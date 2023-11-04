import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation } from "@/lib/navigation";
import clsx from "clsx";

export function Navigation({
  className,
  onLinkClick,
}: {
  className?: string;
  onLinkClick?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
  const pathname = usePathname();

  return (
    <nav className={clsx("text-base lg:text-sm", className)}>
      <ul role="list" className="space-y-9">
        {navigation.map((section) => (
          <li key={section.title}>
            <h2 className="font-display font-medium text-neutral-900 dark:text-white">
              {section.title}
            </h2>
            <ul
              role="list"
              className="mt-2 space-y-2 border-l-2 border-neutral-100 dark:border-neutral-800 lg:mt-4 lg:space-y-4 lg:border-neutral-200"
            >
              {section.links.map((link) => (
                <li key={link.href} className="relative">
                  <Link
                    href={link.href}
                    onClick={onLinkClick}
                    className={clsx(
                      "block w-full pl-3.5 before:pointer-events-none before:absolute before:-left-1 before:top-1/2 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full",
                      link.href === pathname
                        ? "font-semibold text-neutral-500 before:bg-neutral-500"
                        : "text-neutral-500 before:hidden before:bg-neutral-300 hover:text-neutral-600 hover:before:block dark:text-neutral-400 dark:before:bg-neutral-700 dark:hover:text-neutral-300",
                    )}
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
