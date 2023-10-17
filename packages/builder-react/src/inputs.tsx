import {
  type Builder,
  type BuilderStore,
  type Input,
  type SchemaEntityWithId,
} from "builder";

export type InputForRender<TInput extends Input> = {
  name: TInput["name"];
  value: Awaited<ReturnType<TInput["validate"]>>;
  error?: unknown;
};

export type InputComponentProps<
  TInput extends Input = Input,
  TBuilder extends Builder = Builder,
> = {
  input: InputForRender<TInput>;
  entity: SchemaEntityWithId;
  validate: () => Promise<void>;
  resetError: () => void;
  onChange: (value: Awaited<ReturnType<TInput["validate"]>>) => void;
  builderStore: BuilderStore<TBuilder>;
};

export type InputComponent<
  TInput extends Input = Input,
  TBuilder extends Builder = Builder,
> = (props: InputComponentProps<TInput, TBuilder>) => JSX.Element;

export function createInputComponent<TInput extends Input>(
  input: TInput,
  render: InputComponent<TInput>,
): InputComponent<TInput>;
export function createInputComponent<
  TBuilder extends Builder,
  TInput extends Input,
>(
  builder: TBuilder,
  input: TInput,
  render: InputComponent<TInput, TBuilder>,
): InputComponent<TInput, TBuilder>;

export function createInputComponent<
  TBuilder extends Builder,
  TInput extends Input,
>(
  _arg1: TBuilder | TInput,
  arg2: InputComponent<TInput, TBuilder> | TInput,
  arg3?: InputComponent<TInput, TBuilder>,
): InputComponent<TInput, TBuilder> {
  const render = arg3 ?? arg2;

  if (typeof render !== "function") {
    throw new Error("Invalid input component definition.");
  }

  return render;
}
