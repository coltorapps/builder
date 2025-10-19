import * as B from "effect/Brand";
import * as E from "effect/Effect";
import { pipe } from "effect/Function";
import * as R from "effect/Record";

import { type Builder } from "./builder";

export type SuccessResult<TValue = unknown> = {
  readonly success: true;
  readonly value: TValue;
  readonly error?: never;
};

export type UnnormalizedSuccessResult<TValue = unknown> = {
  readonly success: true;
  readonly data: TValue;
  readonly error?: never;
};

export type ErrorResult<TError = unknown> = {
  readonly success: false;
  readonly error: TError;
};

export type Result<TValue = unknown, TError = unknown> =
  | SuccessResult<TValue>
  | ErrorResult<TError>;

export type UnnormalizedResult<TValue = unknown, TError = unknown> =
  | Result<TValue, TError>
  | UnnormalizedSuccessResult<TValue>;

export type RefineResult<TValue, TError = unknown> =
  | Result<TValue, TError>
  | Promise<Result<TValue, TError>>;

export type UnnormalizedRefineResult<TValue = unknown, TError = unknown> =
  | UnnormalizedResult<TValue, TError>
  | Promise<UnnormalizedResult<TValue, TError>>;

export type ParseFunction<TResult extends Result, TContext> = (
  value: unknown,
  context: TContext,
) => TResult;

export type UnnormalizedParseFunction<
  TResult extends UnnormalizedResult,
  TContext,
> = (value: unknown, context: TContext) => TResult;

export type RefineFunction<
  TValue,
  TResult extends RefineResult<TValue>,
  TContext,
> = (value: TValue, context: TContext) => TResult;

export type UnnormalizedRefineFunction<
  TValue,
  TResult extends UnnormalizedRefineResult<TValue>,
  TContext,
> = (value: TValue, context: TContext) => TResult;

export type KeyofStringIntersection<T extends Record<string, unknown>> =
  keyof T & string;

export function flatMapAsResult<TValue, TError>(
  effect: E.Effect<TValue, TError>,
): E.Effect<Result<TValue, TError>, never, never> {
  return pipe(
    effect,
    E.map((value) => ({ success: true as const, value })),
    E.catchAll((error) => E.succeed({ success: false as const, error })),
  );
}

export function runSyncAsResult<TValue, TError>(
  effect: E.Effect<TValue, TError>,
): Result<TValue, TError> {
  return E.runSync(flatMapAsResult(effect));
}

export function runPromiseAsResult<TValue, TError>(
  effect: E.Effect<TValue, TError>,
): Promise<Result<TValue, TError>> {
  return E.runPromise(flatMapAsResult(effect));
}

export function normalizeResult<TData, TError>(
  input: UnnormalizedResult<TData, TError>,
): Result<TData, TError> {
  return "data" in input ? { success: true, value: input.data } : input;
}

export type EntityRef<
  TBuilder extends Builder = Builder,
  TEntityType extends KeyofStringIntersection<
    TBuilder["entities"]
  > = KeyofStringIntersection<TBuilder["entities"]>,
> = { readonly id: string; readonly type: TEntityType } & B.Brand<"EntityRef">;

export function createEntityRef<
  TBuilder extends Builder,
  TEntityType extends KeyofStringIntersection<TBuilder["entities"]>,
>(entityType: TEntityType, entityId: string) {
  return B.nominal<EntityRef<TBuilder, TEntityType>>()({
    id: entityId,
    type: entityType,
  });
}
export type AttributeRef<
  TBuilder extends Builder = Builder,
  TEntityType extends KeyofStringIntersection<
    TBuilder["entities"]
  > = KeyofStringIntersection<TBuilder["entities"]>,
  TAttributeName extends KeyofStringIntersection<
    TBuilder["entities"][TEntityType]["attributes"]
  > = KeyofStringIntersection<TBuilder["entities"][TEntityType]["attributes"]>,
> = {
  readonly name: TAttributeName;
  readonly entityRef: EntityRef<TBuilder, TEntityType>;
} & B.Brand<"AttributeRef">;

export function createAttributeRef<
  TBuilder extends Builder,
  TEntityType extends KeyofStringIntersection<TBuilder["entities"]>,
  TAttributeName extends KeyofStringIntersection<
    TBuilder["entities"][TEntityType]["attributes"]
  >,
>(entityType: TEntityType, entityId: string, attributeName: TAttributeName) {
  return B.nominal<AttributeRef<TBuilder, TEntityType, TAttributeName>>()({
    name: attributeName,
    entityRef: createEntityRef(entityType, entityId),
  });
}

export function filterEmptyRecords<
  T extends Record<string, Record<string, unknown>>,
>(record: T): T {
  return pipe(
    R.filter(record, (value) => !R.isEmptyRecord(value)),
    (result) => result as T,
  );
}
