import * as t from "io-ts";
import { either } from "fp-ts/lib/Either";

export class DateFromISOStringType extends t.Type<Date, string, unknown> {
  readonly _tag: "DateFromISOStringType" = "DateFromISOStringType";
  constructor() {
    super(
      "DateFromISOString",
      (u): u is Date => u instanceof Date,
      (u, c) =>
        either.chain(t.string.validate(u, c), s => {
          const d = new Date(s);
          return isNaN(d.getTime()) ? t.failure(u, c) : t.success(d);
        }),
      a => `${a.getFullYear()}-${a.getMonth() + 1}-${a.getDate()}`
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DateFromISOString extends DateFromISOStringType {}

export const DateFromISOString: DateFromISOString = new DateFromISOStringType();
