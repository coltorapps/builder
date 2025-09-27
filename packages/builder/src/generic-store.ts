import { Store as DataStore } from "@tanstack/store";
import * as B from "effect/Brand";
import * as E from "effect/Effect";

import { Builder } from "./builder";
import { KeyofStringIntersection, Result } from "./utils";

export interface EffectMode {
  kind: "effect";
}
export interface ResultMode {
  kind: "result";
}

export type ModeOutput<F, O = void, E = never> = F extends EffectMode
  ? E.Effect<O, E>
  : Result<O, E>;

export type ModeAsyncOutput<F, O, E> = F extends EffectMode
  ? E.Effect<O, E>
  : Promise<Result<O, E>>;

export interface GenericStore<TBuilder extends Builder, TData> {
  /** @internal */
  readonly _getUnsafeDataStore?: () => DataStore<TData>;
  readonly getBuilder: () => TBuilder;
  readonly getData: () => Readonly<TData>;
  readonly subscribe: (
    listener: (currentValue: TData, prevValue: TData) => void,
  ) => () => void;
}

export function makeGenericStore<TBuilder extends Builder, TData>(
  builder: TBuilder,
  dataStore: DataStore<TData>,
): GenericStore<TBuilder, TData> {
  return {
    _getUnsafeDataStore: () => dataStore,
    getBuilder: () => builder,
    getData: () => dataStore.state,
    subscribe: (listener) =>
      dataStore.subscribe(({ currentVal, prevVal }) =>
        listener(currentVal, prevVal),
      ),
  };
}

export type EntityRef<
  TBuilder extends Builder,
  TEntityType extends KeyofStringIntersection<
    TBuilder["entities"]
  > = KeyofStringIntersection<TBuilder["entities"]>,
> = { readonly id: string; readonly type: TEntityType } & B.Brand<"EntityRef">;

export function createEntityRef<
  TBuilder extends Builder,
  TEntityType extends KeyofStringIntersection<TBuilder["entities"]>,
>(entityType: TEntityType, entityId: string) {
  return B.nominal<EntityRef<TBuilder, TEntityType>>()({
    id: entityId,
    type: entityType,
  });
}
export type AttributeRef<
  TBuilder extends Builder,
  TEntityType extends KeyofStringIntersection<
    TBuilder["entities"]
  > = KeyofStringIntersection<TBuilder["entities"]>,
  TAttributeName extends KeyofStringIntersection<
    TBuilder["entities"][TEntityType]["attributes"]
  > = KeyofStringIntersection<TBuilder["entities"][TEntityType]["attributes"]>,
> = {
  readonly name: TAttributeName;
  readonly entityRef: EntityRef<TBuilder, TEntityType>;
} & B.Brand<"AttributeRef">;

export function createAttributeRef<
  TBuilder extends Builder,
  TEntityType extends KeyofStringIntersection<TBuilder["entities"]>,
  TAttributeName extends KeyofStringIntersection<
    TBuilder["entities"][TEntityType]["attributes"]
  >,
>(entityType: TEntityType, entityId: string, attributeName: TAttributeName) {
  return B.nominal<AttributeRef<TBuilder, TEntityType, TAttributeName>>()({
    name: attributeName,
    entityRef: createEntityRef(entityType, entityId),
  });
}
