import { Effect } from "effect";

export type Ok<TValue = unknown> = { success: true; value: TValue };

export type Err<TError = unknown> = { success: false; error: TError };

export type Result<TValue = unknown, TError = unknown> =
  | Ok<TValue>
  | Err<TError>;

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

export function asResult<TValue, TError>(
  effect: Effect.Effect<TValue, TError>,
): Effect.Effect<Result<TValue, TError>, never, never> {
  return Effect.match(effect, {
    onFailure: (error) => ({ success: false as const, error }),
    onSuccess: (value) => ({ success: true as const, value }),
  });
}
