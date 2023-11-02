import { type Schema, type SchemaEntityWithId } from "./schema";

type AttributeContext = {
  schema: Schema;
  entity: SchemaEntityWithId;
};

export type Attribute<TName extends string = string, TValue = unknown> = {
  name: TName;
  validate: (value: unknown, context: AttributeContext) => TValue;
};

export type AttributesValues<
  TAttributes extends ReadonlyArray<Attribute> = ReadonlyArray<Attribute>,
> = {
  [K in TAttributes[number]["name"]]: Awaited<
    ReturnType<Extract<TAttributes[number], { name: K }>["validate"]>
  >;
};

export function createAttribute<const TName extends string, TValue>(
  options: Attribute<TName, TValue>,
): Attribute<TName, TValue> {
  return options;
}
