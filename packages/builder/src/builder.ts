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

export interface Builder<
  TEntities extends BuilderEntities = BuilderEntities,
  TChildrenAllowed extends ChildrenAllowed<TEntities> = Record<
    string,
    true | ReadonlyArray<string> | undefined
  >,
  TParentRequired extends ReadonlyArray<
    TEntities[number]["name"]
  > = ReadonlyArray<string>,
> {
  entities: TEntities;
  entityId: {
    generate: () => string;
    validate: (id: string) => void;
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
