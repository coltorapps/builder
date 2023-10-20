import { ensureEntityIsRegistered, type Builder } from "./builder";
import { ensureEntityExists, type Schema } from "./schema";

export type EntityValue<TBuilder extends Builder = Builder> =
  | Awaited<ReturnType<TBuilder["entities"][number]["validate"]>>
  | undefined;

export type EntitiesValues<TBuilder extends Builder = Builder> = Record<
  string,
  EntityValue<TBuilder>
>;

export type EntitiesErrors = Record<string, unknown>;

type EntitiesValuesValidationResult<TBuilder extends Builder> =
  | { data: EntitiesValues<TBuilder>; success: true }
  | { entitiesErrors: EntitiesErrors; success: false };

export async function validateEntityValue<TBuilder extends Builder>(
  entityId: string,
  entitiesValues: EntitiesValues<TBuilder>,
  builder: TBuilder,
  schema: Schema<TBuilder>,
): Promise<
  | { value: EntityValue<TBuilder>; success: true }
  | { error: unknown; success: false }
> {
  const entity = ensureEntityExists(entityId, schema.entities);

  const entityDefinition = ensureEntityIsRegistered(entity.type, builder);

  try {
    await entityDefinition.validate(entitiesValues[entityId], {
      entity,
      entitiesValues,
    });

    return { success: true, value: entitiesValues[entityId] };
  } catch (error) {
    return { success: false, error };
  }
}

function getEligibleEntitiesIdsForValidationFromEntity<
  TBuilder extends Builder,
>(
  entityId: string,
  entitiesValues: EntitiesValues<TBuilder>,
  schema: Schema<TBuilder>,
  builder: TBuilder,
): string[] {
  const entity = ensureEntityExists(entityId, schema.entities);

  const entityDefinition = ensureEntityIsRegistered(entity.type, builder);

  const shouldBeProcessed = entityDefinition.shouldBeProcessed({
    entity: { ...entity, id: entityId },
    entitiesValues,
  });

  let eligibleEntities: string[] = [];

  if (entityDefinition.isValueAllowed && shouldBeProcessed) {
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
  entitiesValues: EntitiesValues<TBuilder>,
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
  entitiesValues: EntitiesValues<TBuilder>,
  builder: TBuilder,
  schema: Schema<TBuilder>,
): Promise<EntitiesValuesValidationResult<TBuilder>> {
  const eligibleEntitiesIdsForValidation = getEligibleEntitiesIdsForValidation(
    entitiesValues,
    builder,
    schema,
  );

  const entitiesErrors: EntitiesErrors = {};

  const newEntitiesValues: EntitiesValues<TBuilder> = { ...entitiesValues };

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