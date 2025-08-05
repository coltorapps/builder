import { ensureEntityIsRegistered, type Builder } from "./builder";
import {
  computeContextEntities,
  computeContextEntity,
  type Entity,
} from "./entity";
import { ensureEntityExists, type ParsedSchema } from "./schema";

// export type EntitiesValuesUnion<TEntities extends Record<PropertyKey, Entity>> = {
//   [K in keyof TEntities]: unknown extends EntityValue<TEntities[K]>
//     ? never
//     : EntityValue<TEntities[K]>;
// }[keyof TEntities];
export type EntitiesValuesUnion<TEntities extends Record<PropertyKey, Entity>> =
  any;
type EntityValue<TEntity> = any;

export type EntitiesValues<
  TEntities extends Record<PropertyKey, Entity> = Record<PropertyKey, Entity>,
> = Record<string, EntitiesValuesUnion<TEntities>>;

export type OptionalEntitiesValues<
  TEntities extends Record<PropertyKey, Entity> = Record<PropertyKey, Entity>,
> = Record<string, EntitiesValuesUnion<TEntities> | undefined>;

export type EntitiesErrors = Record<string, unknown>;

export type EntitiesValuesValidationResult<
  TEntities extends Record<string, Entity> = Record<string, Entity>,
> =
  | { data: EntitiesValues<TEntities>; success: true }
  | { entitiesErrors: EntitiesErrors; success: false };

export type EntityValueValidationResult<TEntity extends Entity = Entity> =
  | {
      data: unknown extends EntityValue<TEntity> ? never : EntityValue<TEntity>;
      success: true;
    }
  | { error: unknown; success: false };

export async function validateEntityValue<TBuilder extends Builder>(
  entityId: string,
  entitiesValues: OptionalEntitiesValues<TBuilder["entities"]>,
  builder: TBuilder,
  schema: ParsedSchema<TBuilder>,
): Promise<EntityValueValidationResult<TBuilder["entities"][string]>> {
  const entity = ensureEntityExists(entityId, schema.entities);
  const entityDefinition = ensureEntityIsRegistered(entity.type, builder);

  const context = {
    entity: computeContextEntity(entity, entitiesValues, builder),
    entities: computeContextEntities(entitiesValues, builder, schema),
    schema,
  };

  const computeEntityExtensionValidate = builder.entitiesExtensions[
    entity.type
  ]?.validate?.bind?.(builder.entitiesExtensions[entity.type]);

  try {
    const data = computeEntityExtensionValidate
      ? await computeEntityExtensionValidate(entitiesValues[entityId], {
          ...context,
          validate(value: unknown) {
            return entityDefinition.validate(value, context);
          },
        })
      : await entityDefinition.validate(entitiesValues[entityId], context);

    return { success: true, data } as EntityValueValidationResult<
      TBuilder["entities"][string]
    >;
  } catch (error) {
    return { success: false, error };
  }
}

function getEligibleEntitiesIdsForValidationFromEntity<
  TBuilder extends Builder,
>(
  entityId: string,
  entitiesValues: OptionalEntitiesValues<TBuilder["entities"]>,
  schema: ParsedSchema<TBuilder>,
  builder: TBuilder,
): string[] {
  const entity = ensureEntityExists(entityId, schema.entities);

  const entityDefinition = ensureEntityIsRegistered(entity.type, builder);

  const context = {
    schema,
    entity: computeContextEntity(entity, entitiesValues, builder),
    entities: computeContextEntities(entitiesValues, builder, schema),
  };

  const computeEntityExtensionShouldBeProcessed = builder.entitiesExtensions[
    entity.type
  ]?.shouldBeProcessed?.bind?.(builder.entitiesExtensions[entity.type]);

  const shouldBeProcessed = computeEntityExtensionShouldBeProcessed
    ? computeEntityExtensionShouldBeProcessed({
        ...context,
        shouldBeProcessed() {
          return entityDefinition.shouldBeProcessed(context);
        },
      })
    : entityDefinition.shouldBeProcessed(context);

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
  entitiesValues: OptionalEntitiesValues<TBuilder["entities"]>,
  builder: TBuilder,
  schema: ParsedSchema<TBuilder>,
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
  schema: ParsedSchema<TBuilder>,
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
    } else if (typeof validationResult.data !== "undefined") {
      newEntitiesValues[entityId] =
        validationResult.data as (typeof newEntitiesValues)[string];
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
