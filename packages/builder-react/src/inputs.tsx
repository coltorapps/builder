import { type Input } from "builder";

export type InputForRender<TInput extends Input> = {
  name: TInput["name"];
  value: Awaited<ReturnType<TInput["validate"]>>;
  error?: unknown;
};

export type InputComponent<TInput extends Input> = (props: {
  input: InputForRender<TInput>;
  validate: () => Promise<void>;
  onChange: (value: Awaited<ReturnType<TInput["validate"]>>) => void;
}) => JSX.Element;

export function createInputComponent<TInput extends Input>(
  _input: TInput,
  render: InputComponent<TInput>,
): InputComponent<TInput> {
  return render;
}
