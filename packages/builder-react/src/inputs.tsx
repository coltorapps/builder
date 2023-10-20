import { type Builder, type Input, type SchemaEntityWithId } from "builder";

import { type KeyofUnion } from "./utils";

export type InputForRender<TInput extends Input> = {
  name: TInput["name"];
  value: Awaited<ReturnType<TInput["validate"]>>;
  error?: unknown;
};

export type InputComponentProps<TInput extends Input = Input> = {
  input: InputForRender<TInput>;
  entity: SchemaEntityWithId;
  validate: () => Promise<void>;
  resetError: () => void;
  setValue: (value: Awaited<ReturnType<TInput["validate"]>>) => void;
};

export type InputComponent<TInput extends Input = Input> = (
  props: InputComponentProps<TInput>,
) => JSX.Element;

export function createInputComponent<TInput extends Input>(
  _input: TInput,
  render: InputComponent<TInput>,
): InputComponent<TInput> {
  return render;
}

export type InputsComponents<TBuilder extends Builder = Builder> = {
  [K in TBuilder["entities"][number]["name"]]: {
    [K2 in Extract<
      TBuilder["entities"][number],
      { name: K }
    >["inputs"][number]["name"]]: InputComponent<
      Extract<
        Extract<TBuilder["entities"][number], { name: K }>["inputs"][number],
        { name: K2 }
      >
    >;
  };
};

export type GenericInputProps<TBuilder extends Builder = Builder> = {
  entity: SchemaEntityWithId<TBuilder>;
  input: {
    [K in KeyofUnion<SchemaEntityWithId<TBuilder>["inputs"]>]: InputForRender<
      Extract<TBuilder["entities"][number]["inputs"][number], { name: K }>
    >;
  }[KeyofUnion<SchemaEntityWithId<TBuilder>["inputs"]>];
  children: JSX.Element;
};

export type GenericInputComponent<TBuilder extends Builder = Builder> = (
  props: GenericInputProps<TBuilder>,
) => JSX.Element;
