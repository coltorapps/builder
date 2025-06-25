import { cn } from "@/lib/utils";

import { type EntityAttributesValues } from "@coltorapps/builder";
import {
  useEntityAttributesValues,
  type BuilderEntityComponentProps,
  type InterpreterEntityComponentProps,
} from "@coltorapps/builder-react";

import { type ParagraphEntity } from "./definition";

function Paragraph(props: EntityAttributesValues<ParagraphEntity>) {
  return (
    <pre
      className={cn(
        "m-0 whitespace-pre-wrap break-words !bg-transparent p-0 font-sans text-sm !text-neutral-400 !ring-0 [word-break:break-word]",
        {
          "font-semibold": props.content.bold,
          italic: props.content.italic,
        },
      )}
    >
      {props.content.text.trim() ? (
        props.content.text
      ) : (
        <span className="!text-neutral-500">Empty paragraph.</span>
      )}
    </pre>
  );
}

export function BuilderParagraphEntity(
  props: BuilderEntityComponentProps<ParagraphEntity>,
) {
  const attributes = useEntityAttributesValues(props.entity);

  return <Paragraph {...attributes} />;
}

export function InterpreterParagraphEntity(
  props: InterpreterEntityComponentProps<ParagraphEntity>,
) {
  return <Paragraph {...props.entity.attributes} />;
}
