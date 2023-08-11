import { type Entity } from "./entity";
import { type Input } from "./input";

export type BuilderEntities = ReadonlyArray<
  Entity<string, Array<Input<string>>, unknown>
>;

type ChildrenAllowed<TEntities extends BuilderEntities> = {
  [K in TEntities[number]["name"]]?:
    | ReadonlyArray<TEntities[number]["name"]>
    | true;
};

export interface Builder<
  TEntities extends BuilderEntities,
  TChildrenAllowed extends ChildrenAllowed<TEntities> | undefined,
  TParentRequired extends ReadonlyArray<TEntities[number]["name"]>,
  TId extends string | number,
> {
  entities: TEntities;
  entityId?: {
    generate: () => TId;
    validate: (id: TId) => TId;
  };
  childrenAllowed?: TChildrenAllowed;
  parentRequired?: TParentRequired;
}

export function createBuilder<
  const TEntities extends BuilderEntities,
  const TParentRequired extends ReadonlyArray<TEntities[number]["name"]>,
  const TId extends string | number,
  const TChildrenAllowed extends
    | ChildrenAllowed<TEntities>
    | undefined = undefined,
>(
  options: Builder<TEntities, TChildrenAllowed, TParentRequired, TId>,
): Builder<TEntities, TChildrenAllowed, TParentRequired, TId> {
  return options;
}
