import {
  type Attribute,
  type AttributeContext,
  type AttributeValue,
} from "./attribute";
import { type Builder } from "./builder";
import {
  type EntityValue,
  type OptionalEntitiesValues,
} from "./entities-values";
import { type Schema, type SchemaEntityWithId } from "./schema";
import { type ExtractStringKeys } from "./utils";

export type EntityAttributesValues<TEntity extends Entity = Entity> = {
  [K in keyof TEntity["attributes"]]: AttributeValue<TEntity["attributes"][K]>;
};

export type EntityAttributesErrors<TEntity extends Entity = Entity> = Partial<
  Record<ExtractStringKeys<TEntity["attributes"]>, unknown>
>;

export interface ContextEntityEntry<
  TEntity extends Entity = Entity,
  TType extends string = string,
> extends SchemaEntityWithId<TEntity, TType> {
  value?: EntityValue<TEntity>;
  metadata: TEntity["metadata"];
}

export interface EntityContext<
  TEntity extends Entity = Entity,
  TType extends string = string,
  TEntities extends Record<string, Entity> = Record<string, Entity>,
> {
  entity: ContextEntityEntry<TEntity, TType>;
  schema: Schema<Builder<TEntities>>;
  entities: Record<
    string,
    {
      [K in ExtractStringKeys<TEntities>]: ContextEntityEntry<TEntities[K], K>;
    }[ExtractStringKeys<TEntities>]
  >;
}

interface AttributeValidationExtensionContext<
  TEntity extends Entity = Entity,
  TEntityType extends string = string,
  TAttribute extends Attribute = Attribute,
  TEntities extends Record<string, Entity> = Record<string, Entity>,
> extends AttributeContext<TEntity, TEntityType, TEntities> {
  validate(value: unknown): ReturnType<TAttribute["validate"]>;
}

export interface AttributeExtension<
  TEntity extends Entity = Entity,
  TEntityType extends string = string,
  TAttribute extends Attribute = Attribute,
  TEntities extends Record<string, Entity> = Record<string, Entity>,
> {
  validate?(
    value: unknown,
    context: AttributeValidationExtensionContext<
      TEntity,
      TEntityType,
      TAttribute,
      TEntities
    >,
  ): unknown | Promise<unknown>;
}

export interface AttributeExtensionInput<
  TEntity extends Entity = Entity,
  TEntityType extends string = string,
  TAttribute extends Attribute = Attribute,
  TEntities extends Record<string, Entity> = Record<string, Entity>,
> {
  validate?(
    value: unknown,
    context: AttributeValidationExtensionContext<
      TEntity,
      TEntityType,
      TAttribute,
      TEntities
    >,
  ): AttributeValue<TAttribute> | Promise<AttributeValue<TAttribute>>;
}

export interface Entity<
  TAttributes extends Record<string, Attribute> = Record<string, Attribute>,
  TValue = unknown,
  TValueAllowed extends boolean = boolean,
  TMetadata = unknown,
> {
  attributes: TAttributes;
  valueAllowed: TValueAllowed;
  childrenAllowed: boolean;
  parentRequired: boolean;
  attributesExtensions: Record<string, AttributeExtension>;
  validate(
    value: unknown,
    context: EntityContext<Entity<TAttributes, unknown, boolean, TMetadata>>,
  ): TValue;
  defaultValue(
    context: EntityContext<Entity<TAttributes, unknown, boolean, TMetadata>>,
  ): TValue extends infer U
    ? (unknown extends U ? never : U) | undefined
    : never;
  shouldBeProcessed(
    context: EntityContext<Entity<TAttributes, unknown, boolean, TMetadata>>,
  ): boolean;
  metadata: TMetadata;
}

type OptionalEntityArgs =
  | "attributes"
  | "defaultValue"
  | "validate"
  | "shouldBeProcessed"
  | "childrenAllowed"
  | "metadata"
  | "parentRequired";

interface CreateEntityOptions<
  TAttributes extends Record<string, Attribute>,
  TValue,
  TMetadata,
> extends Omit<
      Entity<TAttributes, TValue>,
      OptionalEntityArgs | "valueAllowed" | "attributesExtensions"
    >,
    Partial<
      Pick<Entity<TAttributes, TValue, boolean, TMetadata>, OptionalEntityArgs>
    > {
  attributesExtensions?: {
    [K in ExtractStringKeys<TAttributes>]?: AttributeExtensionInput<
      Entity<TAttributes, unknown, boolean, TMetadata>,
      string,
      TAttributes[K]
    >;
  };
}

export function createEntity<
  const TAttributes extends Record<string, Attribute>,
  TValue = unknown,
  TMetadata = unknown,
>(
  options?: CreateEntityOptions<TAttributes, TValue, TMetadata>,
): Entity<
  TAttributes,
  TValue,
  unknown extends TValue ? false : true,
  TMetadata
> {
  return {
    ...options,
    metadata: options?.metadata as TMetadata,
    childrenAllowed: options?.childrenAllowed ?? false,
    parentRequired: options?.parentRequired ?? false,
    attributes: options?.attributes ?? ({} as TAttributes),
    valueAllowed: (typeof options?.validate ===
      "function") as unknown extends TValue ? false : true,
    attributesExtensions:
      (options?.attributesExtensions as Entity["attributesExtensions"]) ?? {},
    validate:
      options?.validate ??
      ((value, ctx) => {
        if (typeof value !== "undefined") {
          throw new Error(
            `Values for entities of type "${ctx.entity.type}" are not allowed.`,
          );
        }

        return undefined as TValue;
      }),
    defaultValue: options?.defaultValue ?? (() => undefined as never),
    shouldBeProcessed: options?.shouldBeProcessed ?? (() => true),
  };
}

export function ensureEntityTypeMatches(
  entity: { id: string; type: string },
  type: string,
) {
  if (entity.type !== type) {
    throw new Error(
      `Entity with ID "${entity.id}" is of type "${entity.type}" but expected "${type}".`,
    );
  }
}

export function computeContextEntitiesEntry<TBuilder extends Builder>(
  entity: SchemaEntityWithId<
    TBuilder["entities"][string],
    ExtractStringKeys<TBuilder["entities"]>
  >,
  entityValue: unknown,
  builder: TBuilder,
): ContextEntityEntry {
  return {
    ...entity,
    value: entityValue,
    metadata: builder.entities[entity.type]?.metadata,
  };
}
export function computeContextEntitiesEntries<TBuilder extends Builder>(
  entitiesValues: OptionalEntitiesValues<TBuilder["entities"]>,
  builder: TBuilder,
  schema: Schema<TBuilder>,
): Record<string, ContextEntityEntry> {
  return Object.fromEntries(
    Object.entries(schema.entities).map(([entityId, entity]) => [
      entityId,
      computeContextEntitiesEntry(
        { ...entity, id: entityId },
        entitiesValues[entityId],
        builder,
      ),
    ]),
  );
}
