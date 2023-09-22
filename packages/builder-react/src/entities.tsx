import { type Builder, type SchemaStoreEntityWithId } from "builder";

export type EntityComponent<TBuilder extends Builder = Builder> = (props: {
  entity: SchemaStoreEntityWithId<TBuilder>;
  children?: JSX.Element;
}) => JSX.Element;

export function createEntityComponent<TBuilder extends Builder>(
  _builder: TBuilder,
  render: EntityComponent<TBuilder>,
): EntityComponent<TBuilder> {
  return render;
}
