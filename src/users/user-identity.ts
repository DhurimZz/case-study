/** Remembers which fake user this browser is, so its comments stay editable after a reload. */
export const USER_COOKIE = "image-comments-user";

export const USER_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  // Only in production: some browsers refuse Secure cookies on plain
  // http://localhost, where the app runs in development.
  secure: process.env.NODE_ENV === "production",
} as const;

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
