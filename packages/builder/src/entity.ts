import { type Input } from "./input";

interface EntityContext<TInput extends Array<Input<string>>> {
  inputs: {
    [K in TInput[number]["name"]]: TInput[number] extends {
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
  TInput extends Array<Input<string>>,
  TValue,
> {
  name: TName;
  validate?: (
    value: unknown,
    context: EntityContext<TInput>,
  ) => Promise<TValue> | TValue;
  defaultValue?: (context: EntityContext<TInput>) => TValue | undefined;
  inputs?: TInput;
}

export function createEntity<
  const TName extends string,
  TInput extends Array<Input<string>>,
  TValue,
>(options: Entity<TName, TInput, TValue>): Entity<TName, TInput, TValue> {
  return options;
}
