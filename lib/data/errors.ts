export type ApiErrorCode = "unauthenticated" | "forbidden" | "not_found" | "conflict" | "limit_reached" | "invalid";

/** What a real API would return as a 4xx. Messages are written to be shown to the user as-is. */
export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
