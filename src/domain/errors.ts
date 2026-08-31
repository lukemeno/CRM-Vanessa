export class CalendarConflictError extends Error {
  constructor(message = "calendar_block overlap") {
    super(message);
    this.name = "CalendarConflictError";
  }
}

function postgresCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  if ("code" in error && typeof error.code === "string") {
    return error.code;
  }
  if ("cause" in error) {
    return postgresCode(error.cause);
  }
  return undefined;
}

export function isExclusionViolation(error: unknown): boolean {
  return postgresCode(error) === "23P01";
}

export function throwIfCalendarConflict(error: unknown): never {
  if (isExclusionViolation(error)) {
    throw new CalendarConflictError();
  }
  throw error;
}
