import { NextRequest, NextResponse } from "next/server";
import { NAMES } from "@/database";
import {
  USER_COOKIE,
  USER_COOKIE_OPTIONS,
  getUserIndex,
} from "@/users/user-identity";

// Next.js 16 "proxy" (formerly middleware): runs before the page is served.
// The fake user cookie must exist before any script runs, because Liveblocks
// sends several auth requests at the same time (one per room, resource and
// access level). Without the cookie, each of them would pick its own random
// user on a first visit.
export function proxy(request: NextRequest): NextResponse {
  const userIndex = getUserIndex(
    request.cookies.get(USER_COOKIE)?.value,
    NAMES.length,
    Math.random
  );
  const response = NextResponse.next();
  response.cookies.set(USER_COOKIE, String(userIndex), USER_COOKIE_OPTIONS);
  return response;
}

// Only the page: API routes, scripts, styles and images do not need it.
export const config = {
  matcher: "/",
};
