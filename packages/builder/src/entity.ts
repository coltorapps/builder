import { type Input, type InputsValues } from "./input";

interface EntityContext<
  TInputs extends ReadonlyArray<Input<string, unknown, unknown>>,
  TMeta,
> {
  inputs: InputsValues<TInputs>;
  meta: TMeta;
  values: Record<string, unknown>;
}

export interface Entity<
  TName extends string,
  TInputs extends ReadonlyArray<Input<string, unknown, unknown>>,
  TValue,
  TMeta = NonNullable<unknown>,
> {
  name: TName;
  inputs: TInputs;
  meta: TMeta;
  isValueAllowed: boolean;
  validate: (value: unknown, context: EntityContext<TInputs, TMeta>) => TValue;
  defaultValue: (
    context: EntityContext<TInputs, TMeta>,
  ) => Awaited<TValue> | undefined;
  shouldBeProcessed: (context: EntityContext<TInputs, TMeta>) => boolean;
}

type OptionalEntityArgs =
  | "inputs"
  | "validate"
  | "defaultValue"
  | "meta"
  | "shouldBeProcessed"
  | "isValueAllowed";

export function createEntity<
  const TName extends string,
  const TInputs extends ReadonlyArray<Input<string, unknown, unknown>>,
  TValue,
  const TMeta = NonNullable<unknown>,
>(
  options: Omit<Entity<TName, TInputs, TValue, TMeta>, OptionalEntityArgs> &
    Partial<Pick<Entity<TName, TInputs, TValue, TMeta>, OptionalEntityArgs>>,
): Entity<TName, TInputs, TValue, TMeta> {
  const fallbackInputs = [] as ReadonlyArray<unknown> as TInputs;

  const fallbackMeta = {} as TMeta;

  function fallbackValidator(value: unknown): TValue {
    if (typeof value !== "undefined") {
      throw new Error(
        `Values for entities of type '${options.name}' are not allowed.`,
      );
    }

    return undefined as TValue;
  }

  function fallbackDefaultValue(): undefined {
    return undefined;
  }

  function fallbackShouldBeProcessed(): boolean {
    return true;
  }

  return {
    ...options,
    inputs: options.inputs ?? fallbackInputs,
    meta: options.meta ?? fallbackMeta,
    isValueAllowed: typeof options.validate === "function",
    validate: options.validate ?? fallbackValidator,
    defaultValue: options.defaultValue ?? fallbackDefaultValue,
    shouldBeProcessed: options.shouldBeProcessed ?? fallbackShouldBeProcessed,
  };
}
