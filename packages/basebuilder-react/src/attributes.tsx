import { useContext } from "react";
import {
  builderStoreEventsNames,
  type Attribute,
  type SchemaEntityWithId,
} from "basebuilder";

import { BuilderAttributesContext, useBuilderStoreData } from "./builder";

export type AttributeForRender<TAttribute extends Attribute> = {
  name: TAttribute["name"];
  value: Awaited<ReturnType<TAttribute["validate"]>>;
  error?: unknown;
};

export type AttributeComponentProps<TAttribute extends Attribute = Attribute> =
  {
    attribute: AttributeForRender<TAttribute>;
    entity: SchemaEntityWithId;
    validate: () => Promise<void>;
    resetError: () => void;
    setValue: (value: Awaited<ReturnType<TAttribute["validate"]>>) => void;
  };

export type AttributeComponent<TAttribute extends Attribute = Attribute> = (
  props: AttributeComponentProps<TAttribute>,
) => JSX.Element | null;

export function createAttributeComponent<TAttribute extends Attribute>(
  attribute: TAttribute,
  render: AttributeComponent<TAttribute>,
): () => JSX.Element | null {
  return () => {
    const { builderStore, entityId } = useContext(BuilderAttributesContext);

    const data = useBuilderStoreData(builderStore, (events) =>
      events.some(
        (event) =>
          (event.name === builderStoreEventsNames.EntityAttributeUpdated &&
            event.payload.entity.id === entityId &&
            event.payload.attributeName === attribute.name) ||
          (event.name === builderStoreEventsNames.EntityAttributeErrorUpdated &&
            event.payload.entity.id === entityId &&
            event.payload.attributeName === attribute.name) ||
          event.name === builderStoreEventsNames.EntityAdded ||
          event.name === builderStoreEventsNames.EntityCloned ||
          event.name === builderStoreEventsNames.EntityDeleted ||
          event.name === builderStoreEventsNames.DataSet,
      ),
    );

    const entity = data.schema.entities[entityId];

    if (!entity) {
      throw new Error(
        `[Attribute] The entity with ID "${entityId}" was not found.`,
      );
    }

    const entityDefinition = builderStore.builder.entities.find(
      (item) => item.name === entity.type,
    );

    if (!entityDefinition) {
      throw new Error(
        `[Attribute] The definition for the entity of type "${entity.type}" was not found.`,
      );
    }

    const attributeDefinition = entityDefinition.attributes.find(
      (item) => item.name === attribute.name,
    );

    if (!attributeDefinition) {
      throw new Error(
        `[Attribute] The attribute "${attribute.name}" does not exist within the entity of type "${entity.type}".`,
      );
    }

    const attributeValue = entity.attributes[attribute.name];

    const attributeError =
      data.entitiesAttributesErrors[entityId]?.[attribute.name];

    const computedAttribute = {
      name: attribute.name,
      value: attributeValue as AttributeForRender<TAttribute>["value"],
      error: attributeError,
    };

    const entityWithId = {
      ...entity,
      id: entityId,
    };

    return render({
      attribute: computedAttribute,
      entity: entityWithId,
      setValue: (value) =>
        builderStore.setEntityAttribute(entityId, attribute.name, value),
      validate: () =>
        builderStore.validateEntityAttribute(entityId, attribute.name),
      resetError: () =>
        builderStore.resetEntityAttributeError(entityId, attribute.name),
    });
  };
}
