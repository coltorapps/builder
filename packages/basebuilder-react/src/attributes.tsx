import {
  type Attribute,
  type Builder,
  type SchemaEntityWithId,
} from "basebuilder";

import { type KeyofUnion } from "./utils";

export type AttributeForRender<TAttribute extends Attribute> = {
  name: TAttribute["name"];
  value: Awaited<ReturnType<TAttribute["validate"]>>;
  error?: unknown;
};

export type AttributeComponentProps<TAttribute extends Attribute = Attribute> =
  {
    attribute: AttributeForRender<TAttribute>;
    entity: SchemaEntityWithId;
    validate: () => Promise<void>;
    resetError: () => void;
    setValue: (value: Awaited<ReturnType<TAttribute["validate"]>>) => void;
  };

export type AttributeComponent<TAttribute extends Attribute = Attribute> = (
  props: AttributeComponentProps<TAttribute>,
) => JSX.Element;

export function createAttributeComponent<TAttribute extends Attribute>(
  _attribute: TAttribute,
  render: AttributeComponent<TAttribute>,
): AttributeComponent<TAttribute> {
  return render;
}

export type AttributesComponents<TBuilder extends Builder = Builder> = {
  [K in TBuilder["entities"][number]["name"]]: {
    [K2 in Extract<
      TBuilder["entities"][number],
      { name: K }
    >["attributes"][number]["name"]]: AttributeComponent<
      Extract<
        Extract<
          TBuilder["entities"][number],
          { name: K }
        >["attributes"][number],
        { name: K2 }
      >
    >;
  };
};

export type GenericAttributeProps<TBuilder extends Builder = Builder> = {
  entity: SchemaEntityWithId<TBuilder>;
  attribute: {
    [K in KeyofUnion<
      SchemaEntityWithId<TBuilder>["attributes"]
    >]: AttributeForRender<
      Extract<TBuilder["entities"][number]["attributes"][number], { name: K }>
    >;
  }[KeyofUnion<SchemaEntityWithId<TBuilder>["attributes"]>];
  children: JSX.Element;
};

export type GenericAttributeComponent<TBuilder extends Builder = Builder> = (
  props: GenericAttributeProps<TBuilder>,
) => JSX.Element;
