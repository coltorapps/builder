import { type Attribute, type AttributesValues } from "./attribute";
import { type Entity } from "./entity";
import { type Schema, type SchemaEntityWithId } from "./schema";
import { generateUuid, validateUuid } from "./uuid";

export type EntitiesExtensions<
  TEntities extends ReadonlyArray<Entity> = ReadonlyArray<Entity>,
> = {
  [K in TEntities[number]["name"]]?: {
    childrenAllowed?: boolean | ReadonlyArray<TEntities[number]["name"]>;
    parentRequired?: boolean;
    allowedParents?: ReadonlyArray<TEntities[number]["name"]>;
    attributes?: {
      [K2 in Extract<
        TEntities[number],
        { name: K }
      >["attributes"][number]["name"]]?: {
        validate?: (
          value: unknown,
          context: {
            schema: Schema<Builder<TEntities>>;
            entity: SchemaEntityWithId<
              Builder<[Extract<TEntities[number], { name: K }>]>
            >;
            validate: (
              value: unknown,
            ) => ReturnType<
              Extract<
                Extract<TEntities[number], { name: K }>["attributes"][number],
                { name: K2 }
              >["validate"]
            >;
          },
        ) =>
          | AttributesValues<
              Extract<TEntities[number], { name: K }>["attributes"]
            >[K2]
          | Promise<
              AttributesValues<
                Extract<TEntities[number], { name: K }>["attributes"]
              >[K2]
            >;
      };
    };
  };
};

export type Builder<
  TEntities extends ReadonlyArray<Entity> = ReadonlyArray<Entity>,
  TEntitiesExtensions extends
    EntitiesExtensions<TEntities> = EntitiesExtensions<[]>,
> = {
  entities: TEntities;
  generateEntityId(): string;
  validateEntityId(id: string): void;
  validateSchema(
    schema: Schema<Builder<TEntities, TEntitiesExtensions>>,
  ):
    | Promise<Schema<Builder<TEntities, TEntitiesExtensions>>>
    | Schema<Builder<TEntities, TEntitiesExtensions>>;
  entitiesExtensions: TEntitiesExtensions;
};

type OptionalBuilderArgs =
  | "validateSchema"
  | "generateEntityId"
  | "entitiesExtensions"
  | "validateEntityId";

export function createBuilder<
  const TEntities extends ReadonlyArray<Entity>,
  const TEntitiesExtensions extends
    EntitiesExtensions<TEntities> = EntitiesExtensions<TEntities>,
>(
  options: Omit<Builder<TEntities, TEntitiesExtensions>, OptionalBuilderArgs> &
    Partial<Pick<Builder<TEntities, TEntitiesExtensions>, OptionalBuilderArgs>>,
): Builder<TEntities, TEntitiesExtensions> {
  function fallbackValidateSchema(
    schema: Schema<Builder<TEntities, TEntitiesExtensions>>,
  ): Schema<Builder<TEntities, TEntitiesExtensions>> {
    return schema;
  }

  return {
    ...options,
    validateSchema: options.validateSchema ?? fallbackValidateSchema,
    generateEntityId: options.generateEntityId ?? generateUuid,
    validateEntityId: options.validateEntityId ?? validateUuid,
    entitiesExtensions:
      options.entitiesExtensions ?? ({} as TEntitiesExtensions),
  };
}

export function getEntityDefinition(
  entityType: string,
  builder: Builder,
): Builder["entities"][number] | undefined {
  return builder.entities.find(
    (builderEntity) => builderEntity.name === entityType,
  );
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

  const attribute = entityDefinition.attributes.find(
    (attribute) => attribute.name === attributeName,
  );

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
    (builder.entitiesExtensions as EntitiesExtensions<ReadonlyArray<Entity>>)[
      entityType
    ]?.childrenAllowed ?? entityDefinition.childrenAllowed;

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
  const allowedParents = (
    builder.entitiesExtensions as EntitiesExtensions<ReadonlyArray<Entity>>
  )[entityType]?.allowedParents;

  return !allowedParents || allowedParents.includes(parentEntityType);
}

export function isEntityParentRequired(
  entityType: string,
  builder: Builder,
): boolean {
  const entityDefinition = ensureEntityIsRegistered(entityType, builder);

  return (
    (builder.entitiesExtensions as EntitiesExtensions<ReadonlyArray<Entity>>)[
      entityType
    ]?.parentRequired ?? entityDefinition.parentRequired
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
    (builder.entitiesExtensions as EntitiesExtensions<ReadonlyArray<Entity>>)[
      entityType
    ]?.parentRequired ?? entityDefinition.parentRequired;

  if (parentRequired) {
    throw new Error("A parent is required.");
  }
}
