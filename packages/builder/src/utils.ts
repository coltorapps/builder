export function insertIntoSetAtIndex<T>(
  set: Set<T>,
  value: T,
  index?: number,
): Set<T> {
  const newSet = new Set(set);

  newSet.delete(value);

  const result = Array.from(newSet);

  result.splice(index ?? set.size, 0, value);

  return new Set(result);
}

export type Result<
  TValue = unknown,
  TError = unknown,
  TKey extends string = "data",
> =
  | ({ success: true } & Record<TKey, TValue>)
  | { success: false; error: TError };

export type ParsingFunction<
  TResult extends Result<unknown, unknown>,
  TContext,
> = (value: unknown, context: TContext) => TResult;

export type PromisedRefinementResult<TValue, TError = unknown> =
  | Result<TValue, TError>
  | Promise<Result<TValue, TError>>;

export type RefinementFunction<
  TValue,
  TResult extends PromisedRefinementResult<TValue>,
  TContext,
> = (value: TValue, context: TContext) => TResult;
