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
  } {
    return !excludeName.includes(entity.name);
  });

  if (filteredEntities.length === entities.length) {
    throw new Error(`No such entity "${excludeName}".`);
  }

  return filteredEntities.map((entity) => entity.name);
}
