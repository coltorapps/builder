import {
  type Builder,
  type Entity,
  type SchemaStoreEntityWithId,
} from "builder";

export type EntityComponent<TEntity extends Entity> = (props: {
  entity: SchemaStoreEntityWithId<Builder<[TEntity]>>;
  children?: JSX.Element[];
}) => JSX.Element;

export function createEntityComponent<TEntity extends Entity>(
  _entity: TEntity,
  render: EntityComponent<TEntity>,
): EntityComponent<TEntity> {
  return render;
}
