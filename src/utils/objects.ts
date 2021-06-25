export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function isDefined<T>(value: T | undefined | number): value is T {
  return value !== undefined && value !== null;
}

export type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : DeepPartial<T[P]>;
};
