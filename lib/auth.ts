import { cookies } from "next/headers";

export const AUTH_COOKIE_NAME = "auth";
export const AUTH_COOKIE_VALUE = "true";
export const AUTH_MAX_AGE_SECONDS = 60 * 60 * 8;
export const DEFAULT_APP_PASSWORD = "temp-sns-password";

export function getAppPassword() {
  return process.env.APP_PASSWORD?.trim() || DEFAULT_APP_PASSWORD;
}

export function validatePassword(password: string) {
  return password === getAppPassword();
}

export async function isAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value === AUTH_COOKIE_VALUE;
}
