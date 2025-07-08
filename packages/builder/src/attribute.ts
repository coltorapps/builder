import { type Builder } from "./builder";
import { type Entity } from "./entity";
import { type Schema, type SchemaEntityWithId } from "./schema";

interface ContextEntity<
  TEntity extends Entity = Entity,
  TEntityType extends string = string,
> extends SchemaEntityWithId<TEntity, TEntityType> {
  metadata: TEntity["metadata"];
}

export interface AttributeContext<
  TEntity extends Entity = Entity,
  TEntityType extends string = string,
  TEntities extends Record<string, Entity> = Record<string, Entity>,
> {
  schema: Schema<Builder<TEntities>>;
  entity: ContextEntity<TEntity, TEntityType>;
}

export interface Attribute<TValue = unknown> {
  validate: (value: unknown, context: AttributeContext) => TValue;
}

export type AttributeValue<TAttribute extends Attribute> = Awaited<
  ReturnType<TAttribute["validate"]>
>;

export type AttributeValueValidationResult<
  TAttribute extends Attribute = Attribute,
> =
  | { data: AttributeValue<TAttribute>; success: true }
  | { error: unknown; success: false };

export function createAttribute<TValue>(
  options: Attribute<TValue>,
): Attribute<TValue> {
  return options;
}
