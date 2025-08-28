import { Store as DataStore } from "@tanstack/store";
import * as A from "effect/Array";
import * as D from "effect/Data";
import * as E from "effect/Effect";
import * as Ei from "effect/Either";
import { pipe } from "effect/Function";
import * as O from "effect/Option";
import * as R from "effect/Record";

import type * as builderDefinition from "./builder-definition";
import type * as entityDefinition from "./entity-definition";
import * as schemaParsing from "./schema-parsing";
import * as schemaValidation from "./schema-validation";
import * as utils from "./utils";

interface InterpreterStoreData<
  TBuilder extends
    builderDefinition.BuilderDefinition = builderDefinition.BuilderDefinition,
> {
  entitiesValues: Record<
    string,
    entityDefinition.InferEntityDefinitionParsedValue<
      TBuilder["entities"][string]
    >
  >;
  entitiesErrors: Record<
    string,
    entityDefinition.InferEntityDefinitionParseError<
      TBuilder["entities"][string]
    >
  >;
  unprocessableEntityIds: ReadonlyArray<string>;
}

interface GenericInterpreterStore<
  TBuilder extends
    builderDefinition.BuilderDefinition = builderDefinition.BuilderDefinition,
  TResultMode = utils.EffectMode,
> extends utils.GenericStore<TBuilder, InterpreterStoreData<TBuilder>> {}

export type EffectfulInterpreterStore<
  TBuilder extends builderDefinition.BuilderDefinition,
> = GenericInterpreterStore<TBuilder, utils.EffectMode>;

export type InterpreterStore<
  TBuilder extends builderDefinition.BuilderDefinition,
> = GenericInterpreterStore<TBuilder, utils.ResultMode>;

type CreateInterpreterStoreError = schemaParsing.SchemaParseError;

interface CreateInterpreterStoreOptions<
  TBuilder extends
    builderDefinition.BuilderDefinition = builderDefinition.BuilderDefinition,
> {
  initialData?: Partial<InterpreterStoreData<TBuilder>>;
}

export function createEffectfulInterpreterStore<
  TBuilder extends builderDefinition.BuilderDefinition,
>(
  builder: TBuilder,
  schema: schemaParsing.ParsedSchema<TBuilder>,
  options?: CreateInterpreterStoreOptions<TBuilder>,
): E.Effect<EffectfulInterpreterStore<TBuilder>, CreateInterpreterStoreError> {
  return pipe(
    schemaParsing.parseSchemaWithOptions(schema, builder, {
      parseMissingAttributes: true,
    }),
    E.map((parsedSchema) =>
      pipe(
        new DataStore<InterpreterStoreData<TBuilder>>({
          entitiesValues: {},
          entitiesErrors: {},
          unprocessableEntityIds: [],
        }),
        (dataStore): EffectfulInterpreterStore<TBuilder> => ({
          ...utils.makeGenericStore(builder, dataStore),
        }),
      ),
    ),
  );
}
