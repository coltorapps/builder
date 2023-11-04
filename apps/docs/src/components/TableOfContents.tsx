"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { type Section, type Subsection } from "@/lib/sections";
import clsx from "clsx";

export function TableOfContents({
  tableOfContents,
}: {
  tableOfContents: Array<Section>;
}) {
  const [currentSection, setCurrentSection] = useState(tableOfContents[0]?.id);

  const getHeadings = useCallback((tableOfContents: Array<Section>) => {
    return tableOfContents
      .flatMap((node) => [node.id, ...node.children.map((child) => child.id)])
      .map((id) => {
        const el = document.getElementById(id);
        if (!el) return null;

        const style = window.getComputedStyle(el);
        const scrollMt = parseFloat(style.scrollMarginTop);

        const top = window.scrollY + el.getBoundingClientRect().top - scrollMt;
        return { id, top };
      })
      .filter((x): x is { id: string; top: number } => x !== null);
  }, []);

  useEffect(() => {
    if (tableOfContents.length === 0) return;
    const headings = getHeadings(tableOfContents);
    function onScroll() {
      const top = window.scrollY;
      let current = headings[0].id;
      for (const heading of headings) {
        if (top >= heading.top - 10) {
          current = heading.id;
        } else {
          break;
        }
      }
      setCurrentSection(current);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [getHeadings, tableOfContents]);

  function isActive(section: Section | Subsection) {
    if (section.id === currentSection) {
      return true;
    }
    if (!section.children) {
      return false;
    }
    return section.children.findIndex(isActive) > -1;
  }

  return (
    <div className="hidden xl:sticky xl:top-[4.75rem] xl:-mr-6 xl:block xl:h-[calc(100vh-4.75rem)] xl:flex-none xl:overflow-y-auto xl:py-16 xl:pr-6">
      <nav aria-labelledby="on-this-page-title" className="w-56">
        {tableOfContents.length > 0 && (
          <>
            <h2
              id="on-this-page-title"
              className="font-display text-sm font-medium text-neutral-900 dark:text-white"
            >
              On this page
            </h2>
            <ol role="list" className="mt-4 space-y-3 text-sm">
              {tableOfContents.map((section) => (
                <li key={section.id}>
                  <h3>
                    <Link
                      href={`#${section.id}`}
                      className={clsx(
                        isActive(section)
                          ? "text-neutral-500"
                          : "font-normal text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300",
                      )}
                    >
                      {section.title}
                    </Link>
                  </h3>
                  {section.children.length > 0 && (
                    <ol
                      role="list"
                      className="mt-2 space-y-3 pl-5 text-neutral-500 dark:text-neutral-400"
                    >
                      {section.children.map((subSection) => (
                        <li key={subSection.id}>
                          <Link
                            href={`#${subSection.id}`}
                            className={
                              isActive(subSection)
                                ? "text-neutral-500"
                                : "hover:text-neutral-600 dark:hover:text-neutral-300"
                            }
                          >
                            {subSection.title}
                          </Link>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              ))}
            </ol>
          </>
        )}
      </nav>
    </div>
  );
}
