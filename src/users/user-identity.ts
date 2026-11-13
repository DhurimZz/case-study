/** Remembers which fake user this browser is, so its comments stay editable after a reload. */
export const USER_COOKIE = "image-comments-user";

const USER_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export interface UserCookieOptions {
  httpOnly: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
  secure: boolean;
}

/**
 * `secure` follows the request, not NODE_ENV: `npm start` serves production
 * over plain http://localhost, and Safari drops Secure cookies there, which
 * would make every auth request a different random user again.
 */
export function getUserCookieOptions(requestUrl: URL): UserCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: USER_COOKIE_MAX_AGE_SECONDS,
    secure: requestUrl.protocol === "https:",
  };
}

const DIGITS_ONLY = /^\d+$/;

/**
 * The fake user index for this browser: the one stored in its cookie when that
 * is a whole number within `0..userCount - 1`, otherwise a new random one.
 */
export function getUserIndex(
  cookieValue: string | undefined,
  userCount: number,
  random: () => number
): number {
  const isWholeNumber =
    cookieValue !== undefined && DIGITS_ONLY.test(cookieValue);
  const storedIndex = Number(cookieValue);
  const isValidIndex = isWholeNumber && storedIndex < userCount;
  if (isValidIndex) {
    return storedIndex;
  }
  return Math.floor(random() * userCount);
}
