"use client";
import React, { useEffect, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import { VideoPlayer } from "./videoplayer";
import type {
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";
import {
  getVideoSessionTopicAndToken,
  getSessionUserNamesBySessionId,
} from "@/actions/video-session";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

type User = {
  uid: string | number;
  name: string;
  videoTrack?: ICameraVideoTrack | IRemoteVideoTrack;
  audioTrack?: IMicrophoneAudioTrack | IRemoteAudioTrack;
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
  ); // <-- Store local UID

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
    if (!CHANNEL || !token || sessionUserNames.length === 0) return;

    let isJoined = false;
    let tracks: [IMicrophoneAudioTrack, ICameraVideoTrack] = [null!, null!];

    const handleUserPublished = async (
      user: IAgoraRTCRemoteUser,
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

    const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
      setUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    };

    client.on("user-published", handleUserPublished);
    client.on("user-left", handleUserLeft);

    client
      .join(APP_ID, CHANNEL, token, null)
      .then((uid) =>
        Promise.all([
          AgoraRTC.createMicrophoneAndCameraTracks(),
          uid,
        ])
      )
      .then(([[audioTrack, videoTrack], uid]) => {
        setLocalAgoraUid(uid);
        setLocalTracks([audioTrack, videoTrack]); // <-- Pass tracks up
        const myName =
          sessionUserNames.find((n) => n === session?.user?.name) ||
          sessionUserNames[0];
        setUsers((prev) => {
          if (prev.some((u) => u.uid === uid)) return prev;
          return [
            ...prev,
            { uid, name: myName, videoTrack, audioTrack },
          ];
        });
        isJoined = true;
        client.publish([audioTrack, videoTrack]);
      });

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