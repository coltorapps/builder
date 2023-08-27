export interface Input<TName extends string, TValue> {
  name: TName;
  validate: (value: unknown) => TValue;
  defaultValue: () => Awaited<TValue> | undefined;
}

export type InputsValues<
  TInputs extends ReadonlyArray<Input<string, unknown>>,
> = {
  [K in TInputs[number]["name"]]: Awaited<
    ReturnType<Extract<TInputs[number], { name: K }>["validate"]>
  >;
};

type OptionalInputArgs = "defaultValue";

export function createInput<const TName extends string, TValue>(
  options: Omit<Input<TName, TValue>, OptionalInputArgs> &
    Partial<Pick<Input<TName, TValue>, OptionalInputArgs>>,
): Input<TName, TValue> {
  function fallbackDefaultValue() {
    return undefined;
  }

  return {
    ...options,
    defaultValue: options.defaultValue ?? fallbackDefaultValue,
  };
}
