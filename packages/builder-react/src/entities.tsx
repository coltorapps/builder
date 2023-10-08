import {
  type Builder,
  type Entity,
  type BuilderStoreEntityWithId,
} from "builder";

export type EntityForRender<TBuilder extends Builder = Builder> =
  BuilderStoreEntityWithId<TBuilder>;

export type EntityComponentProps<TEntity extends Entity = Entity> = {
  entity: EntityForRender<Builder<[TEntity]>>;
  children?: JSX.Element[];
  onChange: (value: Awaited<ReturnType<TEntity["validate"]>>) => void;
};

export type EntityComponent<TEntity extends Entity = Entity> = (
  props: EntityComponentProps<TEntity>,
) => JSX.Element;

export function createEntityComponent<TEntity extends Entity>(
  _entity: TEntity,
  render: EntityComponent<TEntity>,
): EntityComponent<TEntity> {
  return render;
}
