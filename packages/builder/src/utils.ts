import { Store as DataStore } from "@tanstack/store";
import * as E from "effect/Effect";

import type * as builderDefinition from "./builder-definition";

export type SuccessResult<TValue = unknown> = {
  success: true;
  value: TValue;
  error?: never;
};

export type ErrorResult<TError = unknown> = { success: false; error: TError };

export type Result<TValue = unknown, TError = unknown> =
  | SuccessResult<TValue>
  | ErrorResult<TError>;

export type RefineResult<TValue, TError = unknown> =
  | Result<TValue, TError>
  | Promise<Result<TValue, TError>>;

export type ParseFunction<TResult extends Result, TContext> = (
  value: unknown,
  context: TContext,
) => TResult;

export type RefineFunction<
  TValue,
  TResult extends RefineResult<TValue>,
  TContext,
> = (value: TValue, context: TContext) => TResult;

export type KeyofStringIntersection<T extends Record<string, unknown>> =
  keyof T & string;

export interface EffectMode {
  kind: "effect";
}
export interface ResultMode {
  kind: "result";
}

export type ModeOutput<F, O = void, E = never> = F extends EffectMode
  ? E.Effect<O, E>
  : Result<O, E>;

export type ModeAsyncOutput<F, O, E> = F extends EffectMode
  ? E.Effect<O, E>
  : Promise<Result<O, E>>;

export interface GenericStore<
  TBuilder extends builderDefinition.BuilderDefinition,
  TData,
> {
  /** @internal */
  _getUnsafeDataStore(): DataStore<TData>;
  getBuilder(): TBuilder;
  getData(): Readonly<TData>;
  subscribe(
    listener: (currentValue: TData, prevValue: TData) => void,
  ): () => void;
}

export function makeGenericStore<
  TBuilder extends builderDefinition.BuilderDefinition,
  TData,
>(
  builder: TBuilder,
  dataStore: DataStore<TData>,
): GenericStore<TBuilder, TData> {
  return {
    _getUnsafeDataStore: () => dataStore,
    getBuilder: () => builder,
    getData: () => dataStore.state,
    subscribe: (listener) =>
      dataStore.subscribe(({ currentVal, prevVal }) =>
        listener(currentVal, prevVal),
      ),
  };
}

export function flatMapAsResult<TValue, TError>(
  effect: E.Effect<TValue, TError>,
): E.Effect<Result<TValue, TError>, never, never> {
  return E.match(effect, {
    onFailure: (error) => ({ success: false as const, error }),
    onSuccess: (value) => ({ success: true as const, value }),
  });
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
