export interface Input<TName extends string, TValue = unknown> {
  name: TName;
  validate: (value: unknown) => Promise<TValue> | TValue;
}

export function createInput<const TName extends string, TValue>(
  options: Input<TName, TValue>,
): Input<TName, TValue> {
  return options;
}
