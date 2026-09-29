// Kept in its own module so services can throw HTTP-aware errors without
// importing the request-handling helpers from lib/api.
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
