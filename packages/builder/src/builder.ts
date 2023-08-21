import { type Entity } from "./entity";
import { type Input } from "./input";

export type BuilderEntities = ReadonlyArray<
  Entity<string, ReadonlyArray<Input<string, unknown, unknown>>, unknown>
>;

type ChildrenAllowed<TEntities extends BuilderEntities> = {
  [K in TEntities[number]["name"]]?:
    | ReadonlyArray<TEntities[number]["name"]>
    | true;
};

export interface Builder<
  TEntities extends BuilderEntities,
  TChildrenAllowed extends ChildrenAllowed<TEntities> = Record<string, never>,
  TParentRequired extends ReadonlyArray<TEntities[number]["name"]> = [],
> {
  entities: TEntities;
  entityId: {
    generate: () => string;
    validate: (id: string) => string;
  };
  childrenAllowed: TChildrenAllowed;
  parentRequired: TParentRequired;
}

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
  function fallbackEntityIdGenerator() {
    return crypto.randomUUID();
  }

  function fallbackEntityIdValidator(id: string) {
    if (
      typeof id !== "string" ||
      !/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i.test(
        id,
      )
    ) {
      throw new Error(`The entity id '${id}' is invalid.`);
    }

    return id;
  }

  return {
    ...options,
    entityId: {
      generate: options.entityId?.generate ?? fallbackEntityIdGenerator,
      validate: options.entityId?.validate ?? fallbackEntityIdValidator,
    },
    childrenAllowed: options.childrenAllowed ?? ({} as TChildrenAllowed),
    parentRequired:
      options.parentRequired ??
      ([] as ReadonlyArray<unknown> as TParentRequired),
  };
}
