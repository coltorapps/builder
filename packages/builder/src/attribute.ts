import { type Schema, type SchemaEntityWithId } from "./schema";

export type AttributeContext = {
  schema: Schema;
  entity: SchemaEntityWithId;
};

export type Attribute<TValue = unknown> = {
  validate: (value: unknown, context: AttributeContext) => TValue;
};

export type AttributesValues<
  TAttributes extends Record<string, Attribute> = Record<string, Attribute>,
> = {
  [K in keyof TAttributes]: Awaited<ReturnType<TAttributes[K]["validate"]>>;
};

export function createAttribute<TValue>(
  options: Attribute<TValue>,
): Attribute<TValue> {
  return options;
}
