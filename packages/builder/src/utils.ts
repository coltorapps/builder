export function insertIntoSetAtIndex<T>(
  set: Set<T>,
  value: T,
  index?: number,
): Set<T> {
  const newSet = new Set(set);

  newSet.delete(value);

  const result = Array.from(newSet);

  result.splice(index ?? set.size, 0, value);

  return new Set(result);
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

export type KeyofUnion<T> = T extends unknown ? keyof T : never;
