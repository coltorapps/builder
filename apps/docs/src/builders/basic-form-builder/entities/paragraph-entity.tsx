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
      <pre className="m-0 whitespace-pre-wrap break-words !bg-transparent p-0 font-sans text-sm !text-white !ring-0 [word-break:break-word]">
        {props.entity.attributes.content.trim() ? (
          props.entity.attributes.content
        ) : (
          <span className="!text-neutral-400">Empty paragraph.</span>
        )}
      </pre>
    );
  },
);
