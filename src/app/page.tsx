"use client";

import { RoomProvider } from "@liveblocks/react/suspense";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ImageComments } from "@/comments/image-comments";

// Not the starter's room: its threads store window pixels, which this app
// would read as image fractions and draw in the wrong place.
const ROOM_ID = "liveblocks:examples:image-comments";

export default function Page() {
  const roomId = useExampleRoomId(ROOM_ID);

  return (
    <RoomProvider id={roomId}>
      <ImageComments
        src="/poster.svg"
        alt="Poster for the Midsummer Light Festival: a sun setting behind mountains over a lake, with dates and programme"
      />
    </RoomProvider>
  );
}

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function useExampleRoomId(roomId: string) {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");

  const exampleRoomId = useMemo(() => {
    return exampleId ? `${roomId}-${exampleId}` : roomId;
  }, [roomId, exampleId]);

  return exampleRoomId;
}
