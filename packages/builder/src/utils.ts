import { Effect } from "effect";

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
  ? Effect.Effect<O, E>
  : Result<O, E>;

export type ModeAsyncOutput<F, O, E> = F extends EffectMode
  ? Effect.Effect<O, E>
  : Promise<Result<O, E>>;

export function flatMapAsResult<TValue, TError>(
  effect: Effect.Effect<TValue, TError>,
): Effect.Effect<Result<TValue, TError>, never, never> {
  return Effect.match(effect, {
    onFailure: (error) => ({ success: false as const, error }),
    onSuccess: (value) => ({ success: true as const, value }),
  });
}

export function runSyncAsResult<TValue, TError>(
  effect: Effect.Effect<TValue, TError>,
): Result<TValue, TError> {
  return Effect.runSync(flatMapAsResult(effect));
}

export function runPromiseAsResult<TValue, TError>(
  effect: Effect.Effect<TValue, TError>,
): Promise<Result<TValue, TError>> {
  return Effect.runPromise(flatMapAsResult(effect));
}
