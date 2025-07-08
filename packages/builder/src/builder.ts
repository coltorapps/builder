import { type Attribute } from "./attribute";
import { type EntityValue } from "./entities-values";
import {
  type AttributeExtensionInput,
  type Entity,
  type EntityContext,
} from "./entity";
import { type Schema } from "./schema";
import { type ExtractStringKeys } from "./utils";
import { generateUuid, validateUuid } from "./uuid";

interface BaseEntityExtension {
  parentRequired?: boolean;
}

interface EntityValidationExtensionContext<
  TEntity extends Entity,
  TType extends string = string,
  TEntities extends Record<string, Entity> = Record<string, Entity>,
> extends EntityContext<TEntity, TType, TEntities> {
  validate(value: unknown): ReturnType<TEntity["validate"]>;
}

interface EntityDefaultValueExtensionContext<
  TEntity extends Entity,
  TType extends string = string,
  TEntities extends Record<string, Entity> = Record<string, Entity>,
> extends EntityContext<TEntity, TType, TEntities> {
  defaultValue(): ReturnType<TEntity["defaultValue"]>;
}

interface EntityShouldBeProcessedExtensionContext<
  TEntity extends Entity,
  TType extends string = string,
  TEntities extends Record<string, Entity> = Record<string, Entity>,
> extends EntityContext<TEntity, TType, TEntities> {
  shouldBeProcessed(): ReturnType<TEntity["shouldBeProcessed"]>;
}

export interface EntityExtension<TEntity extends Entity = Entity>
  extends BaseEntityExtension {
  childrenAllowed?: boolean | ReadonlyArray<string>;
  allowedParents?: ReadonlyArray<string>;
  attributes?: Record<string, AttributeExtensionInput>;
  validate?(
    value: unknown,
    context: EntityValidationExtensionContext<TEntity>,
  ): unknown;
  defaultValue(context: EntityDefaultValueExtensionContext<TEntity>): unknown;
  shouldBeProcessed(
    context: EntityShouldBeProcessedExtensionContext<TEntity>,
  ): boolean;
}

interface EntityExtensionInput<
  TEntities extends Record<string, Entity>,
  TEntity extends Entity,
  TType extends string,
> extends BaseEntityExtension {
  childrenAllowed?: boolean | ReadonlyArray<ExtractStringKeys<TEntities>>;
  allowedParents?: ReadonlyArray<ExtractStringKeys<TEntities>>;
  validate?: TEntity["valueAllowed"] extends true
    ? (
        value: unknown,
        context: EntityValidationExtensionContext<TEntity, TType, TEntities>,
      ) => EntityValue<TEntity> | Promise<EntityValue<TEntity>>
    : never;
  defaultValue?: TEntity["valueAllowed"] extends true
    ? (
        context: EntityDefaultValueExtensionContext<TEntity, TType, TEntities>,
      ) => EntityValue<TEntity>
    : never;
  shouldBeProcessed?(
    context: EntityShouldBeProcessedExtensionContext<TEntity, TType, TEntities>,
  ): boolean;
  attributes?: {
    [K2 in ExtractStringKeys<TEntity["attributes"]>]?: AttributeExtensionInput<
      TEntity,
      TType,
      TEntity["attributes"][K2],
      TEntities
    >;
  };
}

export interface Builder<
  TEntities extends Record<string, Entity> = Record<string, Entity>,
> {
  entities: TEntities;
  generateEntityId(): string;
  validateEntityId(id: string): void;
  validateSchema(
    schema: Schema<Builder<TEntities>>,
  ): Promise<Schema<Builder<TEntities>>> | Schema<Builder<TEntities>>;
  entitiesExtensions: Record<string, EntityExtension>;
}

type OptionalBuilderArgs =
  | "validateSchema"
  | "generateEntityId"
  | "validateEntityId";

interface CreateBuilderOptions<TEntities extends Record<string, Entity>>
  extends Omit<Builder<TEntities>, OptionalBuilderArgs | "entitiesExtensions">,
    Partial<Pick<Builder<TEntities>, OptionalBuilderArgs>> {
  entitiesExtensions?: {
    [K in ExtractStringKeys<TEntities>]?: EntityExtensionInput<
      TEntities,
      TEntities[K],
      K
    >;
  };
}

export function createBuilder<const TEntities extends Record<string, Entity>>(
  options: CreateBuilderOptions<TEntities>,
): Builder<TEntities> {
  function fallbackValidateSchema(
    schema: Schema<Builder<TEntities>>,
  ): Schema<Builder<TEntities>> {
    return schema;
  }

  return {
    ...options,
    validateSchema: options.validateSchema ?? fallbackValidateSchema,
    generateEntityId: options.generateEntityId ?? generateUuid,
    validateEntityId: options.validateEntityId ?? validateUuid,
    entitiesExtensions:
      (options.entitiesExtensions as Builder["entitiesExtensions"]) ?? {},
  };
}

export function getBuilderEntitiesTypes<TBuilder extends Builder>(
  builder: TBuilder,
): ReadonlyArray<ExtractStringKeys<TBuilder["entities"]>> {
  return Object.keys(builder.entities) as unknown as ReadonlyArray<
    ExtractStringKeys<TBuilder["entities"]>
  >;
}

export function getEntityDefinition(
  entityType: string,
  builder: Builder,
): Builder["entities"][number] | undefined {
  return builder.entities[entityType];
}

export function ensureEntityIsRegistered(
  entityType: string,
  builder: Builder,
): Builder["entities"][number] {
  const entityDefinition = getEntityDefinition(entityType, builder);

  if (!entityDefinition) {
    throw new Error(`Unkown entity type "${entityType}".`);
  }

  return entityDefinition;
}

export function ensureEntityAttributeIsRegistered(
  entityType: string,
  attributeName: string,
  builder: Builder,
): Attribute {
  const entityDefinition = ensureEntityIsRegistered(entityType, builder);

  const attribute = entityDefinition.attributes[attributeName];

  if (!attribute) {
    throw new Error(
      `Entity of type "${entityType}" does not have an attribute named "${attributeName}".`,
    );
  }

  return attribute;
}

export function ensureEntityAttributesAreRegistered(
  entityType: string,
  attributeNames: Array<string>,
  builder: Builder,
): Array<Attribute> {
  const attributes = attributeNames.map((attributeName) =>
    ensureEntityAttributeIsRegistered(entityType, attributeName, builder),
  );

  return attributes;
}

export function isEntityChildAllowed(
  entityType: string,
  childEntityType: string,
  builder: Builder,
): boolean {
  const entityDefinition = ensureEntityIsRegistered(entityType, builder);

  const allowedChildren =
    builder.entitiesExtensions[entityType]?.childrenAllowed ??
    entityDefinition.childrenAllowed;

  if (!allowedChildren) {
    return false;
  }

  return allowedChildren === true || allowedChildren.includes(childEntityType);
}

export function isEntityParentAllowed(
  entityType: string,
  parentEntityType: string,
  builder: Builder,
): boolean {
  const allowedParents = builder.entitiesExtensions[entityType]?.allowedParents;

  return !allowedParents || allowedParents.includes(parentEntityType);
}

export function isEntityParentRequired(
  entityType: string,
  builder: Builder,
): boolean {
  const entityDefinition = ensureEntityIsRegistered(entityType, builder);

  return (
    builder.entitiesExtensions[entityType]?.parentRequired ??
    entityDefinition.parentRequired
  );
}

export function ensureEntityChildAllowed(
  entityType: string,
  childEntityType: string,
  builder: Builder,
): void {
  if (!isEntityChildAllowed(entityType, childEntityType, builder)) {
    throw new Error(
      `Entities of type "${childEntityType}" are not allowed as children of entities of type "${entityType}".`,
    );
  }
}

export function ensureEntityParentAllowed(
  entityType: string,
  parentEntityType: string,
  builder: Builder,
): void {
  if (!isEntityParentAllowed(entityType, parentEntityType, builder)) {
    throw new Error(
      `Entities of type "${entityType}" cannot have a parent of type "${parentEntityType}".`,
    );
  }
}

export function ensureEntityCanLackParent(
  entityType: string,
  builder: Builder,
): void {
  const entityDefinition = ensureEntityIsRegistered(entityType, builder);

  const parentRequired =
    builder.entitiesExtensions[entityType]?.parentRequired ??
    entityDefinition.parentRequired;

  if (parentRequired) {
    throw new Error(`Entities of type "${entityType}" require a parent.`);
  }
}
