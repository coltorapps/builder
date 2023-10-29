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
  TChildrenAllowed extends boolean = boolean,
> = {
  name: TName;
  attributes: TAttributes;
  valueAllowed: boolean;
  childrenAllowed: TChildrenAllowed;
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
  | "childrenAllowed"
  | "valueAllowed";

export function createEntity<
  const TName extends string,
  const TAttributes extends ReadonlyArray<Attribute>,
  TValue,
  const TChildrenAllowed extends boolean = false,
>(
  options: Omit<
    Entity<TName, TAttributes, TValue, TChildrenAllowed>,
    OptionalEntityArgs
  > &
    Partial<
      Pick<
        Entity<TName, TAttributes, TValue, TChildrenAllowed>,
        OptionalEntityArgs
      >
    >,
): Entity<TName, TAttributes, TValue, TChildrenAllowed> {
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
    childrenAllowed: options.childrenAllowed ?? (false as TChildrenAllowed),
    attributes: options.attributes ?? fallbackAttributes,
    valueAllowed: typeof options.validate === "function",
    validate: options.validate ?? fallbackValidator,
    defaultValue: options.defaultValue ?? fallbackDefaultValue,
    shouldBeProcessed: options.shouldBeProcessed ?? fallbackShouldBeProcessed,
  };
}

