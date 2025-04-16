import { ensureEntityIsRegistered, type Builder } from "./builder";
import { type Entity } from "./entity";
import { ensureEntityExists, type Schema } from "./schema";

export type EntityValue<TEntity extends Entity = Entity> =
  | Awaited<ReturnType<TEntity["validate"]>>
  | undefined;

export type EntitiesValues<
  TEntities extends Record<string, Entity> = Record<string, Entity>,
> = Record<string, EntityValue<TEntities[string]>>;

export type EntitiesErrors = Record<string, unknown>;

export type EntitiesValuesValidationResult<
  TEntities extends Record<string, Entity>,
> =
  | { data: EntitiesValues<TEntities>; success: true }
  | { entitiesErrors: EntitiesErrors; success: false };

export async function validateEntityValue<TBuilder extends Builder>(
  entityId: string,
  entitiesValues: EntitiesValues<TBuilder["entities"]>,
  builder: TBuilder,
  schema: Schema<TBuilder>,
): Promise<
  | { value: EntityValue<TBuilder["entities"][string]>; success: true }
  | { error: unknown; success: false }
> {
  const entity = ensureEntityExists(entityId, schema.entities);

  const entityDefinition = ensureEntityIsRegistered(entity.type, builder);

  try {
    const value = (await entityDefinition.validate(entitiesValues[entityId], {
      entity,
      entitiesValues,
    })) as EntityValue<TBuilder["entities"][string]>;

    return { success: true, value };
  } catch (error) {
    return { success: false, error };
  }
}

function getEligibleEntitiesIdsForValidationFromEntity<
  TBuilder extends Builder,
>(
  entityId: string,
  entitiesValues: EntitiesValues<TBuilder["entities"]>,
  schema: Schema<TBuilder>,
  builder: TBuilder,
): string[] {
  const entity = ensureEntityExists(entityId, schema.entities);

  const entityDefinition = ensureEntityIsRegistered(entity.type, builder);

  const shouldBeProcessed = entityDefinition.shouldBeProcessed({
    entity,
    entitiesValues,
  });

  let eligibleEntities: string[] = [];

  if (entityDefinition.valueAllowed && shouldBeProcessed) {
    eligibleEntities.push(entityId);
  }

  if (entity.children && shouldBeProcessed) {
    for (const childId of entity.children) {
      eligibleEntities = eligibleEntities.concat(
        getEligibleEntitiesIdsForValidationFromEntity(
          childId,
          entitiesValues,
          schema,
          builder,
        ),
      );
    }
  }

  return eligibleEntities;
}

export function getEligibleEntitiesIdsForValidation<TBuilder extends Builder>(
  entitiesValues: EntitiesValues<TBuilder["entities"]>,
  builder: TBuilder,
  schema: Schema<TBuilder>,
): string[] {
  let eligibleEntities: string[] = [];

  for (const rootEntityId of schema.root) {
    eligibleEntities = eligibleEntities.concat(
      getEligibleEntitiesIdsForValidationFromEntity(
        rootEntityId,
        entitiesValues,
        schema,
        builder,
      ),
    );
  }

  return eligibleEntities;
}

export async function validateEntitiesValues<TBuilder extends Builder>(
  entitiesValues: unknown,
  builder: TBuilder,
  schema: Schema<TBuilder>,
): Promise<EntitiesValuesValidationResult<TBuilder["entities"]>> {
  const computedEntitiesValues =
    typeof entitiesValues !== "object" ||
    Array.isArray(entitiesValues) ||
    entitiesValues === null
      ? {}
      : (entitiesValues as EntitiesValues<TBuilder["entities"]>);

  const eligibleEntitiesIdsForValidation = getEligibleEntitiesIdsForValidation(
    computedEntitiesValues,
    builder,
    schema,
  );

  const entitiesErrors: EntitiesErrors = {};

  const newEntitiesValues: EntitiesValues<TBuilder["entities"]> = {
    ...computedEntitiesValues,
  };

  for (const entityId in newEntitiesValues) {
    if (!eligibleEntitiesIdsForValidation.includes(entityId)) {
      delete newEntitiesValues[entityId];
    }
  }

  for (const entityId of eligibleEntitiesIdsForValidation) {
    const validationResult = await validateEntityValue(
      entityId,
      newEntitiesValues,
      builder,
      schema,
    );

    if (!validationResult.success) {
      entitiesErrors[entityId] = validationResult.error;
    } else {
      newEntitiesValues[entityId] = validationResult.value;
    }
  }

  if (Object.keys(entitiesErrors).length) {
    return {
      success: false,
      entitiesErrors,
    };
  }

  return { success: true, data: newEntitiesValues };
}
