import { type Attribute, type AttributesValues } from "./attribute";
import { type Entity } from "./entity";
import { type Schema, type SchemaEntityWithId } from "./schema";
import { generateUuid, validateUuid } from "./uuid";

export type EntitiesExtensions<
  TEntities extends Record<string, Entity> = Record<string, Entity>,
> = {
  [K in Extract<keyof TEntities, string>]?: {
    childrenAllowed?: boolean | ReadonlyArray<Extract<keyof TEntities, string>>;
    parentRequired?: boolean;
    allowedParents?: ReadonlyArray<Extract<keyof TEntities, string>>;
    attributes?: {
      [K2 in keyof TEntities[K]["attributes"]]?: {
        validate?: (
          value: unknown,
          context: {
            schema: Schema<Builder<TEntities>>;
            entity: SchemaEntityWithId<TEntities[K]>;
            validate: (
              value: unknown,
            ) => ReturnType<TEntities[K]["attributes"][K2]["validate"]>;
          },
        ) =>
          | AttributesValues<TEntities[K]["attributes"]>[K2]
          | Promise<AttributesValues<TEntities[K]["attributes"]>[K2]>;
      };
    };
  };
};

export type Builder<
  TEntities extends Record<string, Entity> = Record<string, Entity>,
> = {
  entities: TEntities;
  generateEntityId(): string;
  validateEntityId(id: string): void;
  validateSchema(
    schema: Schema<Builder<TEntities>>,
  ): Promise<Schema<Builder<TEntities>>> | Schema<Builder<TEntities>>;
  entitiesExtensions: EntitiesExtensions;
};

type OptionalBuilderArgs =
  | "validateSchema"
  | "generateEntityId"
  | "validateEntityId";

interface CreateBuilderOptions<TEntities extends Record<string, Entity>>
  extends Omit<Builder<TEntities>, OptionalBuilderArgs | "entitiesExtensions">,
    Partial<Pick<Builder<TEntities>, OptionalBuilderArgs>> {
  entitiesExtensions?: EntitiesExtensions<TEntities>;
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
      (options.entitiesExtensions as EntitiesExtensions) ?? {},
  };
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
    throw new Error(`Unkown entity attribute "${attributeName}".`);
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
    throw new Error("Child is not allowed.");
  }
}

export function ensureEntityParentAllowed(
  entityType: string,
  parentEntityType: string,
  builder: Builder,
): void {
  if (!isEntityParentAllowed(entityType, parentEntityType, builder)) {
    throw new Error("Parent is not allowed.");
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
    throw new Error("A parent is required.");
  }
}
