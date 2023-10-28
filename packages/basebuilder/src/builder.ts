import { type Attribute, type AttributesValues } from "./attribute";
import { type Entity } from "./entity";
import { type Schema, type SchemaEntityWithId } from "./schema";
import { generateUuid, validateUuid } from "./uuid";

type ChildrenAllowed<TEntities extends ReadonlyArray<Entity>> = {
  [K in TEntities[number]["name"]]?:
    | ReadonlyArray<TEntities[number]["name"]>
    | true;
};

export type EntitiesExtensions<
  TEntities extends ReadonlyArray<Entity> = ReadonlyArray<Entity>,
> = {
  [K in TEntities[number]["name"]]?: {
    attributes?: {
      [K2 in Extract<
        TEntities[number],
        { name: K }
      >["attributes"][number]["name"]]?: {
        validate?: (
          value: AttributesValues<
            Extract<TEntities[number], { name: K }>["attributes"]
          >[K2],
          context: {
            schema: Schema<Builder<TEntities>>;
            entity: SchemaEntityWithId<
              Builder<[Extract<TEntities[number], { name: K }>]>
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
  TChildrenAllowed extends ChildrenAllowed<TEntities> = Record<
    string,
    true | ReadonlyArray<string> | undefined
  >,
  TParentRequired extends ReadonlyArray<
    TEntities[number]["name"]
  > = ReadonlyArray<string>,
  TEntitiesExtensions extends EntitiesExtensions<TEntities> = EntitiesExtensions<
    []
  >,
> = {
  entities: TEntities;
  childrenAllowed: TChildrenAllowed;
  parentRequired: TParentRequired;
  generateEntityId(): string;
  validateEntityId(id: string): void;
  validateSchema(
    schema: Schema<
      Builder<TEntities, TChildrenAllowed, TParentRequired, TEntitiesExtensions>
    >,
  ):
    | Promise<
        Schema<
          Builder<
            TEntities,
            TChildrenAllowed,
            TParentRequired,
            TEntitiesExtensions
          >
        >
      >
    | Schema<
        Builder<
          TEntities,
          TChildrenAllowed,
          TParentRequired,
          TEntitiesExtensions
        >
      >;
  entitiesExtensions: TEntitiesExtensions;
};

type OptionalBuilderArgs =
  | "childrenAllowed"
  | "parentRequired"
  | "validateSchema"
  | "generateEntityId"
  | "entitiesExtensions"
  | "validateEntityId";

export function createBuilder<
  const TEntities extends ReadonlyArray<Entity>,
  const TChildrenAllowed extends ChildrenAllowed<TEntities> = Record<
    string,
    never
  >,
  const TParentRequired extends ReadonlyArray<TEntities[number]["name"]> = [],
  const TEntitiesExtensions extends EntitiesExtensions<TEntities> = EntitiesExtensions<TEntities>,
>(
  options: Omit<
    Builder<TEntities, TChildrenAllowed, TParentRequired, TEntitiesExtensions>,
    OptionalBuilderArgs
  > &
    Partial<
      Pick<
        Builder<
          TEntities,
          TChildrenAllowed,
          TParentRequired,
          TEntitiesExtensions
        >,
        OptionalBuilderArgs
      >
    >,
): Builder<TEntities, TChildrenAllowed, TParentRequired, TEntitiesExtensions> {
  function fallbackValidateSchema(
    schema: Schema<
      Builder<TEntities, TChildrenAllowed, TParentRequired, TEntitiesExtensions>
    >,
  ): Schema<
    Builder<TEntities, TChildrenAllowed, TParentRequired, TEntitiesExtensions>
  > {
    return schema;
  }

  return {
    ...options,
    validateSchema: options.validateSchema ?? fallbackValidateSchema,
    generateEntityId: options.generateEntityId ?? generateUuid,
    validateEntityId: options.validateEntityId ?? validateUuid,
    entitiesExtensions:
      options.entitiesExtensions ?? ({} as TEntitiesExtensions),
    childrenAllowed: options.childrenAllowed ?? ({} as TChildrenAllowed),
    parentRequired:
      options.parentRequired ??
      ([] as ReadonlyArray<unknown> as TParentRequired),
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
  const allowedChildren = builder.childrenAllowed[entityType];

  if (!allowedChildren) {
    return false;
  }

  return allowedChildren === true || allowedChildren.includes(childEntityType);
}

export function isEntityParentRequired(
  entityType: string,
  builder: Builder,
): boolean {
  return builder.parentRequired.includes(entityType);
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

export function ensureEntityCanLackParent(
  entityType: string,
  builder: Builder,
): void {
  if (isEntityParentRequired(entityType, builder)) {
    throw new Error("A parent is required.");
  }
}
