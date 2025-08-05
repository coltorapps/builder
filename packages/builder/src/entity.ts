import {
  AttributeError,
  type Attribute,
  type AttributeRefinementContext,
  type AttributeRefinementResult,
  type AttributeValue,
} from "./attribute";
import { type Builder } from "./builder";
import { type OptionalEntitiesValues } from "./entities-values";
import { type ParsedSchema, type ParsedSchemaEntityWithId } from "./schema";
import type {
  ParsingFunction,
  PromisedRefinementResult,
  RefinementFunction,
  Result,
} from "./utils";

export type EntityAttributesValues<TEntity extends Entity = Entity> = {
  [K in keyof TEntity["attributes"]]: AttributeValue<TEntity["attributes"][K]>;
};

export type EntityAttributesRefinementErrors<TEntity extends Entity = Entity> =
  Partial<{
    [K in keyof TEntity["attributes"]]: AttributeError<
      TEntity["attributes"][K]
    >;
  }>;

export interface ContextEntity<
  TEntity extends Entity = Entity,
  TType extends PropertyKey = PropertyKey,
> {
  id: string;
  type: TType;
  attributes: {
    [K in keyof TEntity["attributes"]]: {
      metadata: TEntity["attributes"][K]["metadata"];
      name: K;
      value: AttributeValue<TEntity["attributes"][K]>;
    };
  };
  parentId?: string;
  children?: ReadonlyArray<string>;
  value?: EntityValue<TEntity>;
  metadata: TEntity["metadata"];
}

export interface EntityParsingContext<
  TEntity extends Entity = Entity,
  TType extends PropertyKey = PropertyKey,
  TEntities extends Record<PropertyKey, Entity> = Record<PropertyKey, Entity>,
> {
  entity: Omit<ContextEntity<TEntity, TType>, "value">;
  schema: ParsedSchema<Builder<TEntities>>;
}

export interface EntityRefinementContext<
  TEntity extends Entity = Entity,
  TType extends PropertyKey = PropertyKey,
  TEntities extends Record<PropertyKey, Entity> = Record<PropertyKey, Entity>,
> {
  entity: Omit<ContextEntity<TEntity, TType>, "value">;
  schema: ParsedSchema<Builder<TEntities>>;
  entities: Record<
    string,
    {
      [K in keyof TEntities]: ContextEntity<TEntities[K], K>;
    }[keyof TEntities]
  >;
}

interface AttributeRefinementOverrideContext<
  TAttribute extends Attribute = Attribute,
  TAttributeName extends PropertyKey = PropertyKey,
  TEntity extends Entity = Entity,
  TEntityType extends PropertyKey = PropertyKey,
  TEntities extends Record<PropertyKey, Entity> = Record<PropertyKey, Entity>,
> extends AttributeRefinementContext<
    TAttribute,
    TAttributeName,
    TEntity,
    TEntityType,
    TEntities
  > {
  refine(
    value: AttributeValue<TAttribute>,
  ): AttributeRefinementResult<TAttribute>;
}

export interface AttributeOverride<
  TAttribute extends Attribute = Attribute,
  TAttributeName extends PropertyKey = PropertyKey,
  TEntity extends Entity = Entity,
  TEntityType extends PropertyKey = PropertyKey,
  TEntities extends Record<PropertyKey, Entity> = Record<PropertyKey, Entity>,
> {
  refine?(
    value: AttributeValue<TAttribute>,
    context: AttributeRefinementOverrideContext<
      TAttribute,
      TAttributeName,
      TEntity,
      TEntityType,
      TEntities
    >,
  ): AttributeRefinementResult<TAttribute>;
}

export interface AttributeOverrideInput<
  TAttribute extends Attribute = Attribute,
  TAttributeName extends PropertyKey = PropertyKey,
  TEntity extends Entity = Entity,
  TEntityType extends PropertyKey = PropertyKey,
  TEntities extends Record<PropertyKey, Entity> = Record<PropertyKey, Entity>,
> {
  refine?(
    value: AttributeValue<TAttribute>,
    context: AttributeRefinementOverrideContext<
      TAttribute,
      TAttributeName,
      TEntity,
      TEntityType,
      TEntities
    >,
  ): AttributeRefinementResult<TAttribute>;
}

export interface Entity<
  TAttributes extends Record<PropertyKey, Attribute> = Record<
    PropertyKey,
    Attribute
  >,
  TValue = unknown,
  TParsingError = unknown,
  TRefinementError = unknown,
  TMetadata = unknown,
> {
  attributes: TAttributes;
  valueAllowed: boolean;
  childrenAllowed: boolean;
  parentRequired: boolean;
  attributesOverrides: Record<PropertyKey, AttributeOverride>;
  validate: [
    parse: ParsingFunction<Result<TValue, TParsingError>, EntityParsingContext>,
    refine: RefinementFunction<
      unknown,
      PromisedRefinementResult<TValue, TParsingError | TRefinementError>,
      EntityRefinementContext
    >,
  ];
  defaultValue(
    context: EntityRefinementContext<
      Entity<TAttributes, unknown, boolean, TMetadata>
    >,
  ): unknown;
  shouldBeProcessed(
    context: EntityRefinementContext<
      Entity<TAttributes, unknown, boolean, TMetadata>
    >,
  ): boolean;
  metadata: TMetadata;
}

export type EntityValue<TEntity extends Entity> = Extract<
  ReturnType<TEntity["validate"][0]>,
  { success: true }
>["data"];

export type EntityRefinementResult<TEntity extends Entity> = ReturnType<
  TEntity["validate"][1]
>;

export type EntityError<TEntity extends Entity> = Extract<
  EntityRefinementResult<TEntity>,
  { success: false }
>["error"];

export function createEntity<
  const TAttributes extends Record<PropertyKey, Attribute> = never,
  TValue = never,
  TParsingError = never,
  TRefinementError = never,
  TMetadata = never,
>(
  options?: {
    attributesOverrides?: {
      [K in keyof TAttributes]?: AttributeOverrideInput<
        TAttributes[K],
        K,
        Entity<TAttributes, unknown, boolean, TMetadata>,
        PropertyKey
      >;
    };
    attributes?: TAttributes;
    childrenAllowed?: boolean;
    parentRequired?: boolean;
    defaultValue?(
      context: EntityRefinementContext<
        Entity<TAttributes, unknown, boolean, TMetadata>
      >,
    ): NoInfer<TValue>;
    shouldBeProcessed?(
      context: EntityRefinementContext<
        Entity<TAttributes, unknown, boolean, TMetadata>
      >,
    ): boolean;
    metadata?: TMetadata;
  } & (
    | {
        validate?: ParsingFunction<
          Result<TValue, TParsingError>,
          EntityParsingContext<Entity<TAttributes, unknown, unknown, TMetadata>>
        >;
      }
    | {
        validate?: [
          parse: ParsingFunction<
            Result<TValue, TParsingError>,
            EntityParsingContext<
              Entity<TAttributes, unknown, unknown, TMetadata>
            >
          >,
          refine: RefinementFunction<
            TValue,
            PromisedRefinementResult<TValue, TParsingError | TRefinementError>,
            EntityRefinementContext<
              Entity<TAttributes, unknown, unknown, TMetadata>
            >
          >,
        ];
      }
  ),
): Entity<
  TAttributes,
  NoInfer<TValue>,
  NoInfer<TParsingError | TRefinementError>,
  NoInfer<TMetadata>
> {
  const forbidenValueErrorMessage = "Value not allowed.";

  const validate = (
    options?.validate
      ? Array.isArray(options.validate)
        ? options.validate
        : [
            options.validate,
            (value: unknown) => ({ success: true, data: value }),
          ]
      : [
          () => {
            throw new Error(forbidenValueErrorMessage);
          },
          () => {
            throw new Error(forbidenValueErrorMessage);
          },
        ]
  ) as Entity<
    TAttributes,
    TValue,
    TParsingError | TRefinementError,
    TMetadata
  >["validate"];

  return {
    ...options,
    metadata: options?.metadata as TMetadata,
    childrenAllowed: options?.childrenAllowed ?? false,
    parentRequired: options?.parentRequired ?? false,
    attributes: options?.attributes ?? ({} as TAttributes),
    valueAllowed: Boolean(options?.validate),
    attributesOverrides:
      (options?.attributesOverrides as Entity["attributesOverrides"]) ?? {},
    validate,
    defaultValue: options?.defaultValue
      ? (...args) => options?.defaultValue?.(...args)
      : () => undefined as never,
    shouldBeProcessed: options?.shouldBeProcessed
      ? (...args) => options?.shouldBeProcessed?.(...args) ?? true
      : () => true,
  };
}

export function computeContextEntity<TBuilder extends Builder>(
  entity: ParsedSchemaEntityWithId<
    TBuilder["entities"][keyof TBuilder["entities"]],
    keyof TBuilder["entities"]
  >,
  entityValue: unknown,
  builder: TBuilder,
): ContextEntity<
  TBuilder["entities"][keyof TBuilder["entities"]],
  keyof TBuilder["entities"]
> {
  const entityDefinition = builder.entities[entity.type];

  const attributes: ContextEntity["attributes"] = {};

  for (const key of Reflect.ownKeys(entityDefinition.attributes)) {
    attributes[key] = {
      value: entity.attributes[key],
      metadata: entityDefinition.attributes[key]?.metadata,
      name: key as never,
    };
  }

  return {
    ...entity,
    value: entityValue,
    metadata: entityDefinition?.metadata,
    attributes: attributes as ContextEntity<
      TBuilder["entities"][keyof TBuilder["entities"]],
      keyof TBuilder["entities"]
    >["attributes"],
  };
}

export function computeContextEntities<TBuilder extends Builder>(
  entitiesValues: OptionalEntitiesValues<TBuilder["entities"]>,
  builder: TBuilder,
  schema: ParsedSchema<TBuilder>,
): Record<string, ContextEntity> {
  return Object.fromEntries(
    Object.entries(schema.entities).map(([entityId, entity]) => [
      entityId,
      computeContextEntity(
        { ...entity, id: entityId },
        entitiesValues[entityId],
        builder,
      ),
    ]),
  );
}
