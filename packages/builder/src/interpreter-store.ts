import { Store as DataStore } from "@tanstack/store";
import * as E from "effect/Effect";
import { pipe } from "effect/Function";

import type * as builder from "./builder";
import type * as entityDefinition from "./entity-definition";
import {
  EffectMode,
  GenericStore,
  makeGenericStore,
  ResultMode,
} from "./generic-store";
import * as schemaParsing from "./schema-parsing";

interface InterpreterStoreData<
  TBuilder extends builder.Builder = builder.Builder,
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
  TBuilder extends builder.Builder = builder.Builder,
  TResultMode = EffectMode,
> extends GenericStore<TBuilder, InterpreterStoreData<TBuilder>> {}

export type EffectfulInterpreterStore<TBuilder extends builder.Builder> =
  GenericInterpreterStore<TBuilder, EffectMode>;

export type InterpreterStore<TBuilder extends builder.Builder> =
  GenericInterpreterStore<TBuilder, ResultMode>;

type CreateInterpreterStoreError = schemaParsing.SchemaStructuralError;

interface CreateInterpreterStoreOptions<
  TBuilder extends builder.Builder = builder.Builder,
> {
  initialData?: Partial<InterpreterStoreData<TBuilder>>;
}

export function createEffectfulInterpreterStore<
  TBuilder extends builder.Builder,
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
          ...makeGenericStore(builder, dataStore),
        }),
      ),
    ),
  );
}
