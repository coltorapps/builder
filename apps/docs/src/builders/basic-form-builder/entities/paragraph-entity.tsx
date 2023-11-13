import { cn } from "@/lib/utils";
import { createEntity } from "basebuilder";

import { createEntityComponent } from "@basebuilder/react";

import { contentAttribute } from "../attributes/content-attribute";

export const paragraphEntity = createEntity({
  name: "paragraph",
  attributes: [contentAttribute],
});

export const ParagraphEntity = createEntityComponent(
  paragraphEntity,
  (props) => {
    return (
      <pre
        className={cn(
          "m-0 whitespace-pre-wrap break-words !bg-transparent p-0 font-sans text-sm !text-neutral-400 !ring-0 [word-break:break-word]",
          {
            "font-semibold": props.entity.attributes.content.bold,
            italic: props.entity.attributes.content.italic,
          },
        )}
      >
        {props.entity.attributes.content.text.trim() ? (
          props.entity.attributes.content.text
        ) : (
          <span className="!text-neutral-500">Empty paragraph.</span>
        )}
      </pre>
    );
  },
);
