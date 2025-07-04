"use client";
import React, { use, useEffect, useState } from "react";
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
  const [localAgoraUid, setLocalAgoraUid] = useState<string | number | null>(
    null
  );
  const [agoraUid, setAgoraUid] = useState<number | null>(null);

  const { data: session } = useSession();
  const userId = session?.user?.id || "";
  // Get sessionId from URL
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  // Fetch channel/token and session user names in parallel on mount
  useEffect(() => {
    fetchChannelAndToken();
  }, []);

  useEffect(() => {
    const fetchNames = async () => {
      if (sessionId) {
        const namesFromDb = await getSessionUserNamesBySessionId(sessionId);
        setSessionUserNames(namesFromDb || []);
      }
    };
    fetchNames();
  }, [sessionId]);

  // Store both UIDs and map them to names
  const [uidNameMap, setUidNameMap] = useState<{ [uid: number]: string }>({});
  console.log("userid", userId);
  const fetchChannelAndToken = async () => {
    const result = await getVideoSessionTopicAndToken(userId);
    console.log("fetchChannelAndToken result:", result); // LOG
    if (result) {
      setCHANNEL(result.topic);
      setToken(result.token);
      setAgoraUid(result.uid);

      // Fetch both UIDs from backend if possible
      if (sessionUserNames.length === 2) {
        // You need both UIDs from backend; assume you can get them as result.uid and result.otherUid
        // If not, fetch them from backend or generate them here
        const myName = session?.user?.name || sessionUserNames[0];
        const otherName =
          sessionUserNames.find((n) => n !== myName) || sessionUserNames[1];
        // You need both UIDs here; adjust as needed
        setUidNameMap({
          [result.uid]: myName,
          // [result.otherUid]: otherName, // If you have the other UID
        });
      }
    }
  };

  // Only run setupAgora when all required values are present
  useEffect(() => {
    if (!CHANNEL || !token || sessionUserNames.length === 0 || !agoraUid) {
      return;
    }

    let localClient: any;
    let tracks: [any, any] = [null, null];
    let isJoined = false;

    const setupAgora = async () => {
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      localClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      client = localClient;

      const handleUserPublished = async (
        user: any,
        mediaType: "audio" | "video"
      ) => {
        await client.subscribe(user, mediaType);

        // Find the remote user's name
        const myName = session?.user?.name || sessionUserNames[0];
        const otherName =
          sessionUserNames.find((n) => n !== myName) || sessionUserNames[1];

        setUidNameMap((prev) => ({
          ...prev,
          [user.uid]: otherName,
        }));

        setUsers((prev) => {
          const existing = prev.find((u) => u.uid === user.uid);
          if (existing) {
            return prev.map((u) =>
              u.uid === user.uid
                ? {
                  ...u,
                  videoTrack:
                    mediaType === "video" ? user.videoTrack : u.videoTrack,
                  audioTrack:
                    mediaType === "audio" ? user.audioTrack : u.audioTrack,
                }
                : u
            );
          }
          // Add new user
          return [
            ...prev,
            {
              uid: user.uid,
              name: otherName,
              videoTrack: mediaType === "video" ? user.videoTrack : undefined,
              audioTrack: mediaType === "audio" ? user.audioTrack : undefined,
            },
          ];
        });
      };

      const handleUserLeft = (user: any) => {
        console.log("User left:", user.uid); // LOG
        setUsers((prev) => prev.filter((u) => u.uid !== user.uid));
      };

      client.on("user-published", handleUserPublished);
      client.on("user-left", handleUserLeft);

      client
        .join(APP_ID, CHANNEL, token, agoraUid)
        .then((uid: any) => {
          return Promise.all([AgoraRTC.createMicrophoneAndCameraTracks(), uid]);
        })
        .then(([tracksArr, uid]: [any, any]) => {
          const [microphoneTrack, cameraTrack] = tracksArr;
          setLocalAgoraUid(uid);
          setLocalTracks([microphoneTrack, cameraTrack]);
          const myName =
            uidNameMap[uid] || session?.user?.name || sessionUserNames[0];
          setUsers((prev) => {
            if (prev.some((u) => u.uid === uid)) return prev;
            return [
              ...prev,
              {
                uid,
                name: myName,
                videoTrack: cameraTrack,
                audioTrack: microphoneTrack,
              },
            ];
          });
          isJoined = true;
          client.publish([microphoneTrack, cameraTrack]);
          tracks = [microphoneTrack, cameraTrack];
          if (cameraTrack) cameraTrack.play(`local-player-${uid}`);
          if (microphoneTrack) microphoneTrack.play();
        })
        .catch((err: any) => {
          console.error("Failed to join Agora channel:", err);
        });
    };

    setupAgora();

    // Cleanup function to stop and close tracks, unpublish, and leave channel
    return () => {
      tracks.forEach((track) => {
        if (track) {
          track.stop();
          track.close();
        }
      });
      if (client) {
        client.removeAllListeners();
        if (isJoined) {
          client.unpublish(tracks).then(() => client.leave());
        }
      }
    };
  }, [
    CHANNEL,
    token,
    sessionUserNames,
    session?.user?.name,
    setLocalTracks,
    agoraUid,
    uidNameMap,
  ]);

  // Helper to map UID to name
  const getNameForUid = (uid: number | string) => {
    return uidNameMap[uid as number] || "Unknown";
  };

  return (
    <div className="flex justify-center items-center">
      <div className="flex gap-8">
        {users.map((user) => (
          <VideoPlayer
            key={user.uid}
            user={user}
            name={
              user.uid === localAgoraUid ? undefined : getNameForUid(user.uid)
            }
            isMe={user.uid === localAgoraUid}
          />
        ))}
      </div>
    </div>
  );
};
