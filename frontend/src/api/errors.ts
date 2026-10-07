import { ApiError } from "./client";
import i18n from "../i18n";

export function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code && i18n.exists(`errors.${err.code}`)) {
      return i18n.t(`errors.${err.code}`);
    }
    return err.message;
  }
  if (err instanceof Error) {
    if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
      return i18n.t("errors.NETWORK_ERROR");
    }
    return err.message;
  }
  return i18n.t("errors.GENERIC");
}

export function isSessionExpired(err: unknown): boolean {
  return err instanceof ApiError && err.code === "SESSION_EXPIRED";
}
