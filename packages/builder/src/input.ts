export interface Input<TName extends string, TValue = unknown> {
  name: TName;
  validate: (value: unknown) => TValue;
}

export type InputsValues<TInputs extends ReadonlyArray<Input<string>>> = {
  [K in TInputs[number]["name"]]: Awaited<
    ReturnType<Extract<TInputs[number], { name: K }>["validate"]>
  >;
};

export function createInput<const TName extends string, TValue>(
  options: Input<TName, TValue>,
): Input<TName, TValue> {
  return options;
}
