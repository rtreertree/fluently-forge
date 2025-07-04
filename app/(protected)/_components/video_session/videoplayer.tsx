"use client";
import React, { useEffect, useRef } from "react";

interface VideoPlayerProps {
  user: any;
  name?: string | null;
  isMe?: boolean;
}

export const VideoPlayer = ({ user, name, isMe }: VideoPlayerProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.videoTrack && ref.current) {
      user.videoTrack.play(ref.current);
    }
    if (user?.audioTrack && !isMe) {
      user.audioTrack.play();
    }
    return () => {
      if (user?.videoTrack && ref.current) {
        user.videoTrack.stop();
      }
      if (user?.audioTrack && !isMe) {
        user.audioTrack.stop();
      }
    };
  }, [user, isMe]);

  return (
    <div
      className={`flex flex-col items-center bg-white dark:bg-black rounded-xl shadow-lg p-4 border-4 ${
        isMe ? "border-green-500" : "border-gray-700"
      }`}
      style={{ width: 400, minHeight: 340 }}
    >
      <div
        className={`mb-2 flex justify-center items-center gap-2 text-lg font-semibold w-full text-center ${
          isMe ? "text-green-500" : "text-black"
        }`}
      >
        <div>
          {isMe ? (
            <span className="text-lg font-semibold text-green-500">You</span>
          ) : (
            <span>{name || "Loading..."}</span>
          )}
        </div>
      </div>
      <div
        ref={ref}
        className="rounded-lg overflow-hidden border border-gray-700 bg-black"
        style={{ width: 360, height: 240 }}
      ></div>
    </div>
  );
};