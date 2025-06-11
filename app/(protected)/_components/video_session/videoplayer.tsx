"use client";
import React, { useEffect, useRef } from "react";

export const VideoPlayer = ({ user }: { user: any }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.videoTrack && ref.current) {
      user.videoTrack.play(ref.current);
    }
  }, [user]);

  return (
    <div>
      Uid: {user.uid}
      <div
        ref={ref}
        style={{ width: "200px", height: "200px" }}
      ></div>
    </div>
  );
};