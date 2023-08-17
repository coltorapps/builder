interface InputContext<TMeta> {
  meta: TMeta;
}

export interface Input<TName extends string, TValue, TMeta> {
  name: TName;
  validate: (value: unknown, context: InputContext<TMeta>) => TValue;
  meta: TMeta;
}

export type InputsValues<
  TInputs extends ReadonlyArray<Input<string, unknown, unknown>>,
> = {
  [K in TInputs[number]["name"]]: Awaited<
    ReturnType<Extract<TInputs[number], { name: K }>["validate"]>
  >;
};

type OptionalInputArgs = "meta";

export function createInput<const TName extends string, TValue, TMeta>(
  options: Omit<Input<TName, TValue, TMeta>, OptionalInputArgs> &
    Partial<Pick<Input<TName, TValue, TMeta>, OptionalInputArgs>>,
): Input<TName, TValue, TMeta> {
  const fallbackMeta = {} as TMeta;

  return {
    ...options,
    meta: options.meta ?? fallbackMeta,
  };
}
