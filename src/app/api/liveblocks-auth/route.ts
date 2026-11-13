import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { NAMES } from "@/database";
import {
  USER_COOKIE,
  getUserCookieOptions,
  getUserIndex,
} from "@/users/user-identity";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/api-reference/authentication
 */

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  // Created per request, not at module scope: the constructor throws without
  // a valid key, and `next build` loads this module, so a missing key would
  // crash the build instead of reaching the 403 above.
  const liveblocks = new Liveblocks({ secret });

  // The starter picked a random fake user on every request, so a reload made
  // you someone else and Liveblocks hid Edit on your own comments. The proxy
  // (src/proxy.ts) sets this browser's user cookie on the page request; the
  // random fallback only applies if the cookie was removed since.
  const userIndex = getUserIndex(
    request.cookies.get(USER_COOKIE)?.value,
    NAMES.length,
    Math.random
  );

  // Create a session for the current user (access token auth)
  const session = liveblocks.prepareSession(`user-${userIndex}`, {
    userInfo: {
      name: NAMES[userIndex],
      avatar: `https://liveblocks.io/avatars/avatar-${userIndex}.png`,
    },
  });

  // Use a naming pattern to allow access to rooms with a wildcard
  session.allow(`liveblocks:examples:*`, ["*:write"]);

  // Authorize the user and return the result
  const { status, body } = await session.authorize();
  const response = new NextResponse(body, { status });
  response.cookies.set(
    USER_COOKIE,
    String(userIndex),
    getUserCookieOptions(request.nextUrl)
  );
  return response;
}
