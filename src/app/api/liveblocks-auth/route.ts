import { Liveblocks } from "@liveblocks/node";
import { NAMES } from "../../../database";
import { NextRequest, NextResponse } from "next/server";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/api-reference/authentication
 */

export async function POST(request: NextRequest) {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  // Created per request, not at module scope: the constructor throws without
  // a valid key, and `next build` loads this module, so a missing key would
  // crash the build instead of reaching the 403 above.
  const liveblocks = new Liveblocks({ secret });

  // Get the current user's unique id from your database
  const userIndex = Math.floor(Math.random() * NAMES.length);

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
  return new NextResponse(body, { status });
}
