"use client";
import React, { useEffect, useRef, useState } from "react";
import { VideoPlayer } from "./videoplayer";
import {
  getVideoSessionTopicAndToken,
  getSessionUserNamesBySessionId,
} from "@/actions/video-session";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { uploadFile } from "@/actions/fileHandler";
import Recorder from "recorder-js";

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

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
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const audioContextRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<any>(null);
  const recordTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: session } = useSession();
  const userId = session?.user?.id || "";
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  // Agora client and join guard
  const clientRef = useRef<any>(null);
  const hasJoinedRef = useRef(false);

  // UID to name mapping
  const [uidNameMap, setUidNameMap] = useState<{ [uid: number]: string }>({});

  // Fetch session user names
  useEffect(() => {
    const fetchNames = async () => {
      if (sessionId) {
        const namesFromDb = await getSessionUserNamesBySessionId(sessionId);
        setSessionUserNames(namesFromDb || []);
      }
    };
    fetchNames();
  }, [sessionId]);

  // Fetch channel, token, and UIDs
  const fetchChannelAndToken = async () => {
    const result = await getVideoSessionTopicAndToken(userId);
    if (result) {
      setCHANNEL(result.topic);
      setToken(result.token);
      setAgoraUid(result.uid);

      // Only map own UID to name
      const myName = session?.user?.name || sessionUserNames[0];
      setUidNameMap({
        [result.uid]: myName,
      });
    }
  };

  // Fetch channel/token on mount
  useEffect(() => {
    fetchChannelAndToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Setup Agora client and join logic
  useEffect(() => {
    if (
      !CHANNEL ||
      !token ||
      sessionUserNames.length === 0 ||
      agoraUid === null ||
      !APP_ID
    ) {
      return;
    }

    let tracks: [any, any] = [null, null];

    const setupAgora = async () => {
      if (!clientRef.current) {
        const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
        clientRef.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      }
      const client = clientRef.current;

      // Only join once
      if (hasJoinedRef.current) return;
      hasJoinedRef.current = true;

      const handleUserPublished = async (
        user: any,
        mediaType: "audio" | "video"
      ) => {
        await client.subscribe(user, mediaType);

        if (user.uid !== agoraUid) {
          // Only set mapping if not already present
          setUidNameMap((prev) => {
            if (prev[user.uid]) return prev;
            const myName = session?.user?.name || sessionUserNames[0];
            const otherName =
              sessionUserNames.find((n) => n !== myName) || sessionUserNames[1];
            return {
              ...prev,
              [user.uid]: otherName,
            };
          });
        }

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
          return [
            ...prev,
            {
              uid: user.uid,
              name: getNameForUid(user.uid),
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

      try {
        console.log("Joining Agora with:", { APP_ID, CHANNEL, token, agoraUid });
        if (!APP_ID || !CHANNEL || !token || !agoraUid) {
          console.error("Missing required Agora join parameters", {
            APP_ID,
            CHANNEL,
            token,
            agoraUid,
          });
          hasJoinedRef.current = false;
          return;
        }
        const uid = await client.join(APP_ID, CHANNEL, token, agoraUid);
        const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
        const tracksArr = await AgoraRTC.createMicrophoneAndCameraTracks();
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
        client.publish([microphoneTrack, cameraTrack]);
        tracks[0] = microphoneTrack;
        tracks[1] = cameraTrack;
        if (cameraTrack) cameraTrack.play(`local-player-${uid}`);

        // <-- Add this to start recording automatically
        if (!isRecording) {
          startRecording();
        }
      } catch (err) {
        console.error("Failed to join Agora channel:", err);
        hasJoinedRef.current = false;
      }
    };

    setupAgora();

    // Cleanup (do NOT use AgoraRTC here)
    return () => {
      tracks.forEach((track) => {
        if (track) {
          track.stop();
          track.close();
        }
      });
      if (clientRef.current) {
        clientRef.current.removeAllListeners();
        if (hasJoinedRef.current) {
          // Only unpublish if tracks are published
          if (tracks[0] || tracks[1]) {
            clientRef.current.unpublish(tracks).catch(() => { });
          }
          clientRef.current.leave().catch(() => { });
          hasJoinedRef.current = false;
        }
      }
    };
  }, [
    CHANNEL,
    token,
    sessionUserNames,
    setLocalTracks,
    agoraUid,
    uidNameMap,
    APP_ID,
  ]);

  const getNameForUid = (uid: number | string) => {
    return uidNameMap[uid as number] || "Unknown";
  };

  const startRecording = async () => {
    setUploadStatus("idle");

    try {

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      recorderRef.current = new Recorder(audioContextRef.current);
      await recorderRef.current.init(stream);
      await recorderRef.current.start();

      const stopAndUpload = async () => {
        if (!recorderRef.current) return;

        const { blob } = await recorderRef.current.stop();
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());

        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const fileName = `${sessionId || "unknown"}/${userId}.wav`;
        setUploadStatus("uploading");
        console.log("Uploading file:", fileName);
        try {
          await uploadFile(Array.from(uint8Array), fileName);
          setUploadStatus("success");
          console.log("Upload successful:", fileName);
        } catch (err) {
          setUploadStatus("error");
          console.error("Upload failed:", err);
        }
      };
      
      // Auto stop after 19.5 minutes (1170000 ms)
      recordTimeoutRef.current = setTimeout(stopAndUpload, 1170000); 

      // Stop & upload on page unload
      const handleUnload = (event: BeforeUnloadEvent) => {
        if (recorderRef.current && recorderRef.current.isRecording) {
          // Prevent unload until recording is stopped
          event.preventDefault();
          event.returnValue = "";
          stopAndUpload().then(() => {
            window.removeEventListener("beforeunload", handleUnload);
            window.location.reload(); // reload after finishing upload
          });
        }
      };

      window.addEventListener("beforeunload", handleUnload);

    } catch (err) {
      console.error("Recording error:", err);
      setUploadStatus("error");
    }
  };


  return (
    <div className="flex flex-col items-center">
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
