import {
  type Builder,
  type Entity,
  type EntityInputsErrors,
  type SchemaStoreEntityWithId,
} from "builder";

import { type KeyofUnion } from "./utils";

export type SchemaStoreEntityForRender<TBuilder extends Builder> = {
  [K in SchemaStoreEntityWithId<TBuilder>["type"]]: Extract<
    SchemaStoreEntityWithId<TBuilder>,
    { type: K }
  > & {
    inputsErrors?: Pick<
      EntityInputsErrors<TBuilder>,
      KeyofUnion<
        Extract<SchemaStoreEntityWithId<TBuilder>, { type: K }>["inputs"]
      >
    >;
  };
}[SchemaStoreEntityWithId<TBuilder>["type"]];

export type EntityComponent<TEntity extends Entity> = (props: {
  entity: SchemaStoreEntityForRender<Builder<[TEntity]>>;
  children?: JSX.Element[];
  onChange: (value: Awaited<ReturnType<TEntity["validate"]>>) => void;
}) => JSX.Element;

export function createEntityComponent<TEntity extends Entity>(
  _entity: TEntity,
  render: EntityComponent<TEntity>,
): EntityComponent<TEntity> {
  return render;
}
