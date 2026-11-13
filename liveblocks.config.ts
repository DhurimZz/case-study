declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string; // Accessible through `user.id`
      info: {
        name: string;
        avatar: string;
      }; // Accessible through `user.info`
    };
    // Where a thread is anchored on the image, as a fraction of the image's
    // natural size: (0, 0) is the top-left corner, (1, 1) the bottom-right.
    // Never screen pixels, so the spot is the same at every pan and zoom.
    ThreadMetadata: {
      x: number;
      y: number;
    };
  }
}

export {};
