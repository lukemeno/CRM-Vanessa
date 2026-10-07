import { customType } from "drizzle-orm/pg-core";

export type TstzRange = {
  start: Date;
  end: Date;
};

const RANGE_RE =
  /^([\[(])\s*"?([^",]+?)"?\s*,\s*"?([^"]+?)"?\s*([\])])$/;

export function parseTstzrange(value: string): TstzRange {
  const match = RANGE_RE.exec(value.trim());
  if (!match) {
    throw new Error(`unrecognised tstzrange: ${value}`);
  }
  const start = new Date(match[2].trim());
  const end = new Date(match[3].trim());
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error(`unrecognised tstzrange: ${value}`);
  }
  return { start, end };
}

export function formatTstzrange(range: TstzRange): string {
  return `["${range.start.toISOString()}","${range.end.toISOString()}")`;
}

export const tstzrange = customType<{ data: TstzRange; driverData: string }>({
  dataType() {
    return "tstzrange";
  },
  toDriver(value) {
    return formatTstzrange(value);
  },
  fromDriver(value) {
    return parseTstzrange(String(value));
  },
});
