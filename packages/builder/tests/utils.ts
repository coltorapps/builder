import { type ErrorResult, type SuccessResult, type Result } from "../src/utils";

export function dataResultAsValueResult<TData, TError>(
  input: { success: true; data: TData } | { success: false; error: TError },
): Result<TData, TError> {
  return input.success
    ? { success: true, value: input.data }
    : { success: false, error: input.error };
}

export function assertErrorResult<TResult extends Result<unknown, unknown>>(
  result: TResult,
): asserts result is Extract<TResult, ErrorResult> {
  if (result.success) {
    throw new Error("Expected failure");
  }
}

export function assertSuccessResult<TResult extends Result<unknown, unknown>>(
  result: TResult,
): asserts result is Extract<TResult, SuccessResult> {
  if (!result.success) {
    throw new Error("Expected success");
  }
}
