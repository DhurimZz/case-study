import { useLostConnectionListener, useStatus } from "@liveblocks/react";
import { useState } from "react";
import { ConnectionState } from "./comments-status";

/** Liveblocks' connection status and lost-connection events, as one ConnectionState. */
export function useConnectionState(): ConnectionState {
  const status = useStatus();
  const [hasLostConnection, setHasLostConnection] = useState(false);

  useLostConnectionListener((event): void => {
    setHasLostConnection(event === "lost");
  });

  if (status === "disconnected") {
    return "failed";
  }
  if (hasLostConnection) {
    return "lost";
  }
  return "connected";
}
