import { type Input, type InputsValues } from "./input";

type EntityContext<TInputs extends ReadonlyArray<Input>> = {
  inputs: InputsValues<TInputs>;
  values: Record<string, unknown>;
};

export type Entity<
  TName extends string = string,
  TInputs extends ReadonlyArray<Input> = ReadonlyArray<Input>,
  TValue = unknown,
> = {
  name: TName;
  inputs: TInputs;
  isValueAllowed: boolean;
  validate: (value: unknown, context: EntityContext<TInputs>) => TValue;
  defaultValue: (
    context: EntityContext<TInputs>,
  ) => Awaited<TValue> | undefined;
  shouldBeProcessed: (context: EntityContext<TInputs>) => boolean;
};

type OptionalEntityArgs =
  | "inputs"
  | "validate"
  | "defaultValue"
  | "shouldBeProcessed"
  | "isValueAllowed";

export function createEntity<
  const TName extends string,
  const TInputs extends ReadonlyArray<Input>,
  TValue,
>(
  options: Omit<Entity<TName, TInputs, TValue>, OptionalEntityArgs> &
    Partial<Pick<Entity<TName, TInputs, TValue>, OptionalEntityArgs>>,
): Entity<TName, TInputs, TValue> {
  const fallbackInputs = [] as ReadonlyArray<unknown> as TInputs;

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
    isValueAllowed: typeof options.validate === "function",
    validate: options.validate ?? fallbackValidator,
    defaultValue: options.defaultValue ?? fallbackDefaultValue,
    shouldBeProcessed: options.shouldBeProcessed ?? fallbackShouldBeProcessed,
  };
}
