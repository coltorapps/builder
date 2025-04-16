import { type Attribute, type AttributesValues } from "./attribute";
import { type Schema, type SchemaEntityWithId } from "./schema";

export type EntityContext<TEntity extends Entity = Entity> = {
  entity: {
    id: string;
    attributes: AttributesValues<TEntity["attributes"]>;
    children?: Array<string>;
    parentId?: string;
  };
  entitiesValues: Record<string, unknown>;
};

export type AttributesExtensions<TEntity extends Entity = Entity> = {
  [K in keyof TEntity["attributes"]]?: {
    validate?: (
      value: unknown,
      context: {
        schema: Schema;
        entity: SchemaEntityWithId<TEntity>;
        validate: (
          value: unknown,
        ) => ReturnType<TEntity["attributes"][K]["validate"]>;
      },
    ) =>
      | AttributesValues<TEntity["attributes"]>[K]
      | Promise<AttributesValues<TEntity["attributes"]>[K]>;
  };
};

export type Entity<
  TAttributes extends Record<string, Attribute> = Record<string, Attribute>,
  TValue = unknown,
  TParentRequired extends boolean = boolean,
  TChildrenAllowed extends boolean = boolean,
> = {
  attributes: TAttributes;
  valueAllowed: boolean;
  childrenAllowed: TChildrenAllowed;
  parentRequired: TParentRequired;
  attributesExtensions: AttributesExtensions<Entity<TAttributes>>;
  validate: (
    value: unknown,
    context: EntityContext<Entity<TAttributes>>,
  ) => TValue;
  defaultValue: (
    context: EntityContext<Entity<TAttributes>>,
  ) => Awaited<TValue> | undefined;
  shouldBeProcessed: (context: EntityContext<Entity<TAttributes>>) => boolean;
};

type OptionalEntityArgs =
  | "attributes"
  | "validate"
  | "defaultValue"
  | "shouldBeProcessed"
  | "childrenAllowed"
  | "attributesExtensions"
  | "parentRequired";

interface CreateEntityOptions<
  TAttributes extends Record<string, Attribute>,
  TValue,
  TChildrenAllowed extends boolean,
  TParentRequired extends boolean,
> extends Omit<
      Entity<TAttributes, TValue, TParentRequired, TChildrenAllowed>,
      OptionalEntityArgs | "valueAllowed"
    >,
    Partial<
      Pick<
        Entity<TAttributes, TValue, TParentRequired, TChildrenAllowed>,
        OptionalEntityArgs
      >
    > {}

export function createEntity<
  const TAttributes extends Record<string, Attribute>,
  TValue,
  const TChildrenAllowed extends boolean = false,
  const TParentRequired extends boolean = false,
>(
  options: CreateEntityOptions<
    TAttributes,
    TValue,
    TChildrenAllowed,
    TParentRequired
  >,
): Entity<TAttributes, TValue, TParentRequired, TChildrenAllowed> {
  function fallbackValidator(value: unknown): TValue {
    if (typeof value !== "undefined") {
      throw new Error(`Values are not allowed.`);
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
    parentRequired: options.parentRequired ?? (false as TParentRequired),
    attributes: options.attributes ?? ({} as TAttributes),
    valueAllowed: typeof options.validate === "function",
    attributesExtensions: options.attributesExtensions ?? {},
    validate: options.validate ?? fallbackValidator,
    defaultValue: options.defaultValue ?? fallbackDefaultValue,
    shouldBeProcessed: options.shouldBeProcessed ?? fallbackShouldBeProcessed,
  };
}
