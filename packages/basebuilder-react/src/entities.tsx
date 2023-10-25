import {
  type Builder,
  type Entity,
  type SchemaEntityWithId,
} from "basebuilder";

export type EntityForRender<TEntity extends Entity = Entity> =
  SchemaEntityWithId<Builder<[TEntity]>> & {
    value?: Awaited<ReturnType<TEntity["validate"]>>;
    error?: unknown;
  };

export type EntityComponentProps<TEntity extends Entity = Entity> = {
  entity: EntityForRender<TEntity>;
  children?: JSX.Element[];
  setValue: (value?: Awaited<ReturnType<TEntity["validate"]>>) => void;
  validate: () => Promise<void>;
  resetError: () => void;
  resetValue: () => void;
  clearValue: () => void;
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

export type EntitiesComponents<TBuilder extends Builder = Builder> = {
  [K in TBuilder["entities"][number]["name"]]: EntityComponent<
    Extract<TBuilder["entities"][number], { name: K }>
  >;
};

export type GenericEntityProps<TBuilder extends Builder = Builder> = {
  entity: EntityForRender<TBuilder["entities"][number]>;
  children: JSX.Element;
};

export type GenericEntityComponent<TBuilder extends Builder = Builder> = (
  props: GenericEntityProps<TBuilder>,
) => JSX.Element;
