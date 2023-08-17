import { type BuilderEntities } from "./builder";

export function getEntitiesNamesExcept<
  const TEntities extends BuilderEntities,
  const TExcludeName extends ReadonlyArray<TEntities[number]["name"]>,
>(
  entities: TEntities,
  excludeName: TExcludeName,
): ReadonlyArray<Exclude<TEntities[number]["name"], TExcludeName[number]>> {
  const filteredEntities = entities.filter(function (entity): entity is {
    name: Exclude<TEntities[number]["name"], TExcludeName[number]>;
    inputs: [];
    validate: () => unknown;
    defaultValue: () => unknown;
    meta: unknown;
  } {
    return !excludeName.includes(entity.name);
  });

  if (filteredEntities.length === entities.length) {
    throw new Error(`No such entity "${excludeName}".`);
  }

  return filteredEntities.map((entity) => entity.name);
}

type UndefinedKeys<T> = {
  [K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];

type NonUndefinedKeys<T> = {
  [K in keyof T]: undefined extends T[K] ? never : K;
}[keyof T];

export type OptionalPropsIfUndefined<T> = {
  [K in UndefinedKeys<T>]?: T[K];
} & {
  [K in NonUndefinedKeys<T>]: T[K];
};
