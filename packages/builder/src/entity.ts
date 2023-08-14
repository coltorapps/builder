import { type Input } from "./input";

export interface EntityContext<TInputs extends ReadonlyArray<Input<string>>> {
  inputs: {
    [K in TInputs[number]["name"]]: TInputs[number] extends {
      name: K;
      validate?: infer RValidator;
    }
      ? RValidator extends (...args: Array<unknown>) => unknown
        ? Awaited<ReturnType<RValidator>>
        : never
      : never;
  };
}

export interface Entity<
  TName extends string,
  TInputs extends ReadonlyArray<Input<string>>,
  TValue,
> {
  name: TName;
  validate?: (
    value: unknown,
    context: EntityContext<TInputs>,
  ) => Promise<TValue> | TValue;
  defaultValue?: (context: EntityContext<TInputs>) => TValue | undefined;
  inputs: TInputs;
}

type OptionalEntityArgs = "inputs";

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
    inputs: options.inputs ?? ([] as ReadonlyArray<unknown> as TInputs),
  };
}
