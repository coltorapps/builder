import {
  type ErrorResult,
  type Result,
  type SuccessResult,
} from "../src/utils";

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
