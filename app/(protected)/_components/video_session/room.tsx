"use client";
import React, { useEffect, useState } from "react";
import { VideoPlayer } from "./videoplayer";
import {
  getVideoSessionTopicAndToken,
  getSessionUserNamesBySessionId,
} from "@/actions/video-session";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

let client: any = null; // Will be set after dynamic import

type User = {
  uid: string | number;
  name: string;
  videoTrack?: any;
  audioTrack?: any;
};

type VideoRoomProps = {
  micOn: boolean;
  camOn: boolean;
  setLocalTracks: (tracks: [any, any]) => void;
};

export const VideoRoom = ({ micOn, camOn, setLocalTracks }: VideoRoomProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [CHANNEL, setCHANNEL] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessionUserNames, setSessionUserNames] = useState<string[]>([]);
  const [localAgoraUid, setLocalAgoraUid] = useState<string | number | null>(null);

  const { data: session } = useSession();

  // Get sessionId from URL
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  // Fetch channel and token on mount
  useEffect(() => {
    fetchChannelAndToken();
  }, []);

  // Fetch session user names from DB
  useEffect(() => {
    const fetchNames = async () => {
      if (sessionId) {
        const namesFromDb = await getSessionUserNamesBySessionId(sessionId);
        setSessionUserNames(namesFromDb || []);
      }
    };
    fetchNames();
  }, [sessionId]);

  const fetchChannelAndToken = async () => {
    const result = await getVideoSessionTopicAndToken();
    if (result) {
      setCHANNEL(result.topic);
      setToken(result.token);
    }
  };

  useEffect(() => {
    let localClient: any;
    let tracks: [any, any] = [null, null];
    let isJoined = false;

    const setupAgora = async () => {
      // Dynamic import so it only runs in the browser
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      localClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      client = localClient;

      if (!CHANNEL || !token || sessionUserNames.length === 0) return;

      const handleUserPublished = async (
        user: any,
        mediaType: "audio" | "video"
      ) => {
        await client.subscribe(user, mediaType);
        setUsers((prev) => {
          const remoteName =
            sessionUserNames.find((n) => n !== session?.user?.name) ||
            sessionUserNames[1];
          const existing = prev.find((u) => u.uid === user.uid);
          if (existing) {
            return prev.map((u) =>
              u.uid === user.uid
                ? {
                    ...u,
                    videoTrack: mediaType === "video" ? user.videoTrack : u.videoTrack,
                    audioTrack: mediaType === "audio" ? user.audioTrack : u.audioTrack,
                  }
                : u
            );
          }
          // Add new user
          return [
            ...prev,
            {
              uid: user.uid,
              name: remoteName,
              videoTrack: mediaType === "video" ? user.videoTrack : undefined,
              audioTrack: mediaType === "audio" ? user.audioTrack : undefined,
            },
          ];
        });
      };

      const handleUserLeft = (user: any) => {
        setUsers((prev) => prev.filter((u) => u.uid !== user.uid));
      };

      client.on("user-published", handleUserPublished);
      client.on("user-left", handleUserLeft);

      client
        .join(APP_ID, CHANNEL, token, null)
        .then((uid: any) =>
          Promise.all([
            AgoraRTC.createMicrophoneAndCameraTracks(),
            uid,
          ])
        )
        .then(([tracksArr, uid]: [any, any]) => {
          const [microphoneTrack, cameraTrack] = tracksArr; // [audio, video]
          setLocalAgoraUid(uid);
          setLocalTracks([microphoneTrack, cameraTrack]);
          const myName =
            sessionUserNames.find((n) => n === session?.user?.name) ||
            sessionUserNames[0];
          setUsers((prev) => {
            if (prev.some((u) => u.uid === uid)) return prev;
            return [
              ...prev,
              { uid, name: myName, videoTrack: cameraTrack, audioTrack: microphoneTrack },
            ];
          });
          isJoined = true;
          client.publish([microphoneTrack, cameraTrack]);
          tracks = [microphoneTrack, cameraTrack];
        });

      // Cleanup
      return () => {
        tracks.forEach((track) => {
          if (track) {
            track.stop();
            track.close();
          }
        });
        client.off("user-published", handleUserPublished);
        client.off("user-left", handleUserLeft);
        if (isJoined) {
          client.unpublish(tracks).then(() => client.leave());
        }
      };
    };

    setupAgora();

    return () => {
      // cleanup if needed
    };
  }, [CHANNEL, token, sessionUserNames, session?.user?.name, setLocalTracks]);

  return (
    <div className="flex justify-center items-center">
      <div className="flex gap-8">
        {users.map((user, idx) => (
          <VideoPlayer
            key={user.uid}
            user={user}
            name={user.uid === localAgoraUid ? undefined : user.name}
            isMe={user.uid === localAgoraUid}
          />
        ))}
      </div>
    </div>
  );
};