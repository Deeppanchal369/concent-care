import { ApiError } from "./client";

export function friendlyError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something unexpected happened. Please try again.";
}

export function isSessionExpired(err: unknown): boolean {
  return err instanceof ApiError && err.code === "SESSION_EXPIRED";
}
