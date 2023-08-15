import { type Input, type InputsValues } from "./input";

export interface EntityContext<TInputs extends ReadonlyArray<Input<string>>> {
  inputs: InputsValues<TInputs>;
}

export interface Entity<
  TName extends string,
  TInputs extends ReadonlyArray<Input<string>>,
  TValue,
> {
  name: TName;
  validate: (value: unknown, context: EntityContext<TInputs>) => TValue;
  defaultValue: (
    context: EntityContext<TInputs>,
  ) => Awaited<TValue> | undefined;
  inputs: TInputs;
}

type OptionalEntityArgs = "inputs" | "validate" | "defaultValue";

export function createEntity<
  const TName extends string,
  const TInputs extends ReadonlyArray<Input<string>>,
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

  function fallbackDefaultValue() {
    return undefined;
  }

  return {
    ...options,
    inputs: options.inputs ?? fallbackInputs,
    validate: options.validate ?? fallbackValidator,
    defaultValue: options.defaultValue ?? fallbackDefaultValue,
  };
}
