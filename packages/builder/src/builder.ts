import { type Entity } from "./entity";
import { type Input } from "./input";

export type BuilderEntities = ReadonlyArray<
  Entity<string, ReadonlyArray<Input<string>>, unknown>
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

type OptionalBuilderArgs = "entityId" | "childrenAllowed" | "parentRequired";

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
    OptionalBuilderArgs
  > &
    Partial<
      Pick<
        Builder<TEntities, TChildrenAllowed, TParentRequired>,
        OptionalBuilderArgs
      >
    >,
): Builder<TEntities, TChildrenAllowed, TParentRequired> {
  return {
    ...options,
    entityId: options.entityId ?? {
      generate() {
        return Math.floor(Math.random() * Date.now()).toString(16);
      },
      validate(id) {
        if (typeof id !== "string") {
          throw new Error(`The entity id '${id}' is invalid.`);
        }

        return id;
      },
    },
    childrenAllowed: options.childrenAllowed ?? ({} as TChildrenAllowed),
    parentRequired:
      options.parentRequired ??
      ([] as ReadonlyArray<unknown> as TParentRequired),
  };
}
