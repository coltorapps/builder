import { type Input, type SchemaEntityWithId } from "builder";

export type InputForRender<TInput extends Input> = {
  name: TInput["name"];
  value: Awaited<ReturnType<TInput["validate"]>>;
  error?: unknown;
};

export type InputComponentProps<TInput extends Input = Input> = {
  input: InputForRender<TInput>;
  entity: SchemaEntityWithId;
  validate: () => Promise<void>;
  onChange: (value: Awaited<ReturnType<TInput["validate"]>>) => void;
};

export type InputComponent<TInput extends Input> = (
  props: InputComponentProps<TInput>,
) => JSX.Element;

export function createInputComponent<TInput extends Input>(
  _input: TInput,
  render: InputComponent<TInput>,
): InputComponent<TInput> {
  return render;
}
