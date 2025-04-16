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
