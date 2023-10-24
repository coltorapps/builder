import {
  type Entity as BaseEntity,
  type Builder,
  type InterpreterStore,
} from "builder";

import { type EntityForRender, type GenericEntityComponent } from "./entities";

function Entity(props: {
  entityId: string;
  components: EntitiesComponents;
  renderEntity: GenericEntityComponent;
  interpreterStore: InterpreterStore;
}): Promise<JSX.Element | null> | null {
  const entity = props.interpreterStore.schema.entities[props.entityId];

  if (!entity) {
    throw new Error("Entity not found.");
  }

  const entityDefinition = props.interpreterStore.builder.entities.find(
    (item) => item.name === entity.type,
  );

  const entityWithId = {
    ...entity,
    id: props.entityId,
  };

  if (!entityDefinition) {
    throw new Error("Entity definition not found.");
  }

  const childrenIds = entity?.children ?? [];

  const EntityComponent = props.components[entity.type];

  if (!EntityComponent) {
    throw new Error("Entity component not found.");
  }

  const data = props.interpreterStore.getData();

  const shouldBeProcessed = entityDefinition.shouldBeProcessed({
    entity: entityWithId,
    entitiesValues: data.entitiesValues,
  });

  if (!shouldBeProcessed) {
    return null;
  }

  const entityForRender: EntityForRender = {
    ...entityWithId,
    value: data.entitiesValues[props.entityId],
    error: data.entitiesErrors[props.entityId],
  };

  const children = (
    /* @ts-expect-error Server Component */
    <EntityComponent entity={entityForRender}>
      {childrenIds.map((entityId) => (
        /* @ts-expect-error Server Component */
        <Entity key={entityId} {...props} />
      ))}
    </EntityComponent>
  );

  /* @ts-expect-error Server Component */
  return props.renderEntity({
    entity: entityForRender,
    children,
  });
}

export function Interpreter<TBuilder extends Builder>(props: {
  interpreterStore: InterpreterStore<TBuilder>;
  components: EntitiesComponents<TBuilder>;
  children?: GenericEntityComponent<TBuilder>;
}): Array<JSX.Element> {
  return props.interpreterStore.schema.root.map((entityId) => (
    /* @ts-expect-error Server Component */
    <Entity
      key={entityId}
      entityId={entityId}
      renderEntity={
        (props.children as GenericEntityComponent) ??
        ((props) => props.children)
      }
      interpreterStore={props.interpreterStore}
      components={props.components as unknown as EntitiesComponents}
    />
  ));
}

export type EntityComponentProps<TEntity extends BaseEntity = BaseEntity> = {
  entity: EntityForRender<TEntity>;
  children?: JSX.Element[];
};

export type EntityComponent<TEntity extends BaseEntity = BaseEntity> = (
  props: EntityComponentProps<TEntity>,
) => Promise<JSX.Element> | JSX.Element;

export function createEntityComponent<TEntity extends BaseEntity>(
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
