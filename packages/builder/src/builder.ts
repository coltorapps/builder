import { type Entity } from "./entity";
import { type Input } from "./input";
import { generateUuid, validateUuid } from "./uuid";

export type BuilderEntities = ReadonlyArray<
  Entity<string, ReadonlyArray<Input<string, unknown>>, unknown>
>;

type ChildrenAllowed<TEntities extends BuilderEntities> = {
  [K in TEntities[number]["name"]]?:
    | ReadonlyArray<TEntities[number]["name"]>
    | true;
};

export type Builder<
  TEntities extends BuilderEntities = BuilderEntities,
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
  const TEntities extends BuilderEntities,
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

export function ensureEntityInputIsRegistered(
  entityType: string,
  inputName: string,
  builder: Builder,
): Input {
  const entityDefinition = ensureEntityIsRegistered(entityType, builder);

  const input = entityDefinition.inputs.find(
    (input) => input.name === inputName,
  );

  if (!input) {
    throw new Error(`Unkown entity input "${inputName}".`);
  }

  return input;
}

export function ensureEntityInputsAreRegistered(
  entityType: string,
  inputNames: Array<string>,
  builder: Builder,
): Array<Input> {
  const inputs = inputNames.map((inputName) =>
    ensureEntityInputIsRegistered(entityType, inputName, builder),
  );

  return inputs;
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
