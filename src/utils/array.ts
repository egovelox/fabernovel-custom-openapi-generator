export function isArray<T>(object: unknown): object is T[] {
  return Array.isArray(object);
}

export function removeUndefinedValues<T>(array: Array<T | undefined>): T[] {
  return array.filter((_) => _ !== undefined) as T[];
}
