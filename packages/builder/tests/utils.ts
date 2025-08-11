import { type Err, type Ok, type Result } from "../src/utils";

export function dataToValueResult<TData, TError>(
  input: { success: true; data: TData } | { success: false; error: TError },
): Result<TData, TError> {
  return input.success
    ? { success: true, value: input.data }
    : { success: false, error: input.error };
}

export function assertErrResult<TResult extends Result<unknown, unknown>>(
  result: TResult,
): asserts result is Extract<TResult, Err> {
  if (result.success) {
    throw new Error("Expected failure");
  }
}

export function assertOkResult<TResult extends Result<unknown, unknown>>(
  result: TResult,
): asserts result is Extract<TResult, Ok> {
  if (!result.success) {
    throw new Error("Expected success");
  }
}
