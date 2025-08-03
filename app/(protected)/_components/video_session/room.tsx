"use client";
import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { VideoPlayer } from "./videoplayer";
import {
  getVideoSessionTopicAndToken,
  getSessionUserNamesBySessionId,
} from "@/actions/video-session";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
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

export const VideoRoom = forwardRef<any, VideoRoomProps>(({ micOn, camOn, setLocalTracks }, ref) => {
  console.log("VideoRoom mounted");
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
  const fetchNames = async () => {
    if (sessionId) {
      const namesFromDb = await getSessionUserNamesBySessionId(sessionId);
      setSessionUserNames(namesFromDb || []);
    }
  };

  // Fetch channel, token, and UIDs
  const fetchChannelAndToken = async () => {
    const result = await getVideoSessionTopicAndToken(userId);
    if (result) {
      setCHANNEL(result.topic);
      setToken(result.token);
      setAgoraUid(result.uid);

      const myName = session?.user?.name || sessionUserNames[0];
      setUidNameMap({
        [result.uid]: myName,
      });
    }
  };

  // Setup Agora client and join logic
  const setupAgora = async () => {
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
        alert("Missing required Agora parameters. Please reload the page.");
        setUploadStatus("error");
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
      if (!isRecording) {
        startRecording();
      }
    } catch (err) {
      console.error("Failed to join Agora channel:", err);
      hasJoinedRef.current = false;
    }

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
  };

  // Log sessionId and userId outside effects
  // Fetch session user names when sessionId changes
  useEffect(() => {
    fetchNames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Fetch channel and token when userId changes
  useEffect(() => {
    console.log("useEffect [userId] triggered");
    fetchChannelAndToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Setup Agora when all required values are ready
  useEffect(() => {
    console.log("useEffect [Agora dependencies] triggered", {
      CHANNEL,
      token,
      sessionUserNames,
      agoraUid,
      APP_ID,
    });
    setupAgora();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    CHANNEL,
    token,
    sessionUserNames,
    agoraUid,
    APP_ID,
    setLocalTracks,
  ]);

  const getNameForUid = (uid: number | string) => {
    return uidNameMap[uid as number] || "Unknown";
  };

  const stopAndUpload = async () => {
    if (!recorderRef.current) return;
    if (!token || !sessionId || !userId) {
      alert("Missing token, sessionId, or userId. Please reload and try again.");
      setUploadStatus("error");
      return;
    }
    setUploadStatus("uploading");
    try {
      const { blob: userBlob } = await recorderRef.current.stop();


      if (recorderRef.current.stream) {
        recorderRef.current.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }

      const formData = new FormData();
      formData.append("user-audio", userBlob, `${sessionId}/${userId}.wav`);
      formData.append("user-id", userId);
      formData.append("session-id", sessionId);

      const response = await fetch("/api/session/video-audio", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload failed:", errorText, "Status:", response.status);
        alert(`Upload failed: ${errorText} (Status: ${response.status})`);
        setUploadStatus("error");
        throw new Error("Upload failed");
      }

      setUploadStatus("success");
      console.log("Upload successful");
    } catch (err) {
      setUploadStatus("error");
      console.error("Upload failed:", err);
    }
  };

  // Start recording
  const startRecording = async () => {
    setUploadStatus("idle");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      recorderRef.current = new Recorder(audioContextRef.current);
      await recorderRef.current.init(stream);
      recorderRef.current.stream = stream;
      await recorderRef.current.start();
    } catch (err) {
      console.error("Recording error:", err);
      setUploadStatus("error");
    }
  };

  useImperativeHandle(ref, () => ({ stopAndUpload }), [stopAndUpload]);

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
      <div className="mt-2 text-xs text-gray-500">
        {uploadStatus === "uploading" && "Uploading audio..."}
        {uploadStatus === "success" && "Audio upload complete."}
        {uploadStatus === "error" && "Audio upload failed."}
      </div>
    </div>
  );
});
