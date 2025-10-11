import { type Store as DataStore } from "@tanstack/store";
import type { Effect } from "effect/Effect";

import { type Builder } from "./builder";
import { type Result } from "./utils";

export interface EffectMode {
  kind: "effect";
}
export interface ResultMode {
  kind: "result";
}

export type ModeOutput<F, O = void, E = never> = F extends EffectMode
  ? Effect<O, E>
  : Result<O, E>;

export type ModeAsyncOutput<F, O, E> = F extends EffectMode
  ? Effect<O, E>
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
