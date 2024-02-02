import { cn } from "@/lib/utils";

import { createEntityComponent } from "@coltorapps/builder-react";

import { paragraphEntity } from "./definition";

export const ParagraphEntity = createEntityComponent(
  paragraphEntity,
  function ParagraphEntity(props) {
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
