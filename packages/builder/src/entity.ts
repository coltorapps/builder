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
  validate: (
    value: unknown,
    context: EntityContext<TInputs>,
  ) => Promise<TValue> | TValue;
  defaultValue: (context: EntityContext<TInputs>) => TValue | undefined;
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
  return {
    ...options,
    validate:
      options.validate ??
      ((value) => {
        if (value) {
          throw new Error("No value allowed");
        }

        return undefined as TValue;
      }),
    inputs: options.inputs ?? ([] as ReadonlyArray<unknown> as TInputs),
    defaultValue: options.defaultValue ?? (() => undefined),
  };
}
