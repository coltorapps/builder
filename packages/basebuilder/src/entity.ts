import { type Attribute, type AttributesValues } from "./attribute";

type EntityContext<TAttributes extends ReadonlyArray<Attribute>> = {
  entity: {
    id: string;
    attributes: AttributesValues<TAttributes>;
  };
  entitiesValues: Record<string, unknown>;
};

export type Entity<
  TName extends string = string,
  TAttributes extends ReadonlyArray<Attribute> = ReadonlyArray<Attribute>,
  TValue = unknown,
> = {
  name: TName;
  attributes: TAttributes;
  isValueAllowed: boolean;
  validate: (value: unknown, context: EntityContext<TAttributes>) => TValue;
  defaultValue: (
    context: EntityContext<TAttributes>,
  ) => Awaited<TValue> | undefined;
  shouldBeProcessed: (context: EntityContext<TAttributes>) => boolean;
};

type OptionalEntityArgs =
  | "attributes"
  | "validate"
  | "defaultValue"
  | "shouldBeProcessed"
  | "isValueAllowed";

export function createEntity<
  const TName extends string,
  const TAttributes extends ReadonlyArray<Attribute>,
  TValue,
>(
  options: Omit<Entity<TName, TAttributes, TValue>, OptionalEntityArgs> &
    Partial<Pick<Entity<TName, TAttributes, TValue>, OptionalEntityArgs>>,
): Entity<TName, TAttributes, TValue> {
  const fallbackAttributes = [] as ReadonlyArray<unknown> as TAttributes;

  function fallbackValidator(value: unknown): TValue {
    if (typeof value !== "undefined") {
      throw new Error(
        `Values for entities of type '${options.name}' are not allowed.`,
      );
    }

    return undefined as TValue;
  }

  function fallbackDefaultValue(): undefined {
    return undefined;
  }

  function fallbackShouldBeProcessed(): boolean {
    return true;
  }

  return {
    ...options,
    attributes: options.attributes ?? fallbackAttributes,
    isValueAllowed: typeof options.validate === "function",
    validate: options.validate ?? fallbackValidator,
    defaultValue: options.defaultValue ?? fallbackDefaultValue,
    shouldBeProcessed: options.shouldBeProcessed ?? fallbackShouldBeProcessed,
  };
}
