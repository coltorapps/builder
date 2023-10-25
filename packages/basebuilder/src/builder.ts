import { type Attribute } from "./attribute";
import { type Entity } from "./entity";
import { generateUuid, validateUuid } from "./uuid";

type ChildrenAllowed<TEntities extends ReadonlyArray<Entity>> = {
  [K in TEntities[number]["name"]]?:
    | ReadonlyArray<TEntities[number]["name"]>
    | true;
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
> = {
  entities: TEntities;
  entityId: {
    generate: () => string;
    validate: (id: string) => void;
  };
  childrenAllowed: TChildrenAllowed;
  parentRequired: TParentRequired;
};

type OptionalBuilderArgs = "childrenAllowed" | "parentRequired";

export function createBuilder<
  const TEntities extends ReadonlyArray<Entity>,
  const TChildrenAllowed extends ChildrenAllowed<TEntities> = Record<
    string,
    never
  >,
  const TParentRequired extends ReadonlyArray<TEntities[number]["name"]> = [],
>(
  options: Omit<
    Builder<TEntities, TChildrenAllowed, TParentRequired>,
    OptionalBuilderArgs | "entityId"
  > &
    Partial<
      Pick<
        Builder<TEntities, TChildrenAllowed, TParentRequired>,
        OptionalBuilderArgs
      >
    > & {
      entityId?: Partial<
        Builder<TEntities, TChildrenAllowed, TParentRequired>["entityId"]
      >;
    },
): Builder<TEntities, TChildrenAllowed, TParentRequired> {
  return {
    ...options,
    entityId: {
      generate: options.entityId?.generate ?? generateUuid,
      validate: options.entityId?.validate ?? validateUuid,
    },
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
