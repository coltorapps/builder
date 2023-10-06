import {
  type SchemaStoreData,
  type SchemaStoreEntityWithId,
} from "./schema-store";

type InputContext = {
  schema: SchemaStoreData;
  entity: SchemaStoreEntityWithId;
};

export type Input<TName extends string = string, TValue = unknown> = {
  name: TName;
  validate: (value: unknown, context: InputContext) => TValue;
};

export type InputsValues<TInputs extends ReadonlyArray<Input>> = {
  [K in TInputs[number]["name"]]: Awaited<
    ReturnType<Extract<TInputs[number], { name: K }>["validate"]>
  >;
};

export function createInput<const TName extends string, TValue>(
  options: Input<TName, TValue>,
): Input<TName, TValue> {
  return options;
}
