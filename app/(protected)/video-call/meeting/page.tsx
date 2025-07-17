"use client";
import { useState, useEffect, useRef } from "react";
import { VideoRoom } from "../../_components/video_session/room";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { getUserVideoSession } from "@/actions/video-session";
import Loader from "@/components/suspend/loading"; // <-- Import Loader

const MeetingPage = () => {
  const videoRoomRef = useRef<any>(null);
  const { data: session } = useSession();
  const [userSession, setUserSession] = useState<any>(null);
  const [isEnding, setIsEnding] = useState(false);
  const [loading, setLoading] = useState(true);

  // Mic/camera state
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  // Store local tracks for toggling
  const [localTracks, setLocalTracks] = useState<[any, any]>([null, null]);

  // Timer state
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      const userId = session?.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }
      const sessionData = await getUserVideoSession(userId);
      setUserSession(sessionData);
      setLoading(false);
    };
    fetchSession();
  }, [session?.user?.id]);

  // Session timer logic and handle page refresh/unload
  useEffect(() => {
    if (!userSession || !userSession.startedAt) return;

    // Parse startedAt as local time and subtract 7 hours (25200000 ms) to get UTC
    const localStart = new Date(userSession.startedAt);
    const startTime = localStart.getTime() - (7 * 60 * 60 * 1000);

    // Session ends 30 minutes after startedAt
    const endTime = startTime + 30 * 60 * 1000; // 30 minutes in ms
    const alertTime = endTime - 5 * 60 * 1000;  // 5 minutes before end

    const interval = setInterval(() => {
      const now = Date.now();
      const msLeft = endTime - now;
      const minLeft = Math.max(0, Math.ceil(msLeft / 60000)); // Clamp to 0

      setMinutesLeft(minLeft);

      // Show alert at 15 minutes (5 minutes left)
      if (
        now >= alertTime &&
        now < alertTime + 1100 // Only once
      ) {
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 10000); // Hide after 10 seconds
      }

      // End session at 20 minutes
      if (now >= endTime) {
        clearInterval(interval);
        handleEndSession(true); // true = auto end
      }
    }, 1000);

    // Alert user if they try to refresh/leave
    const handleUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = ""; // This triggers the browser warning
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);
    };
    // eslint-disable-next-line
  }, [userSession]);

  const handleEndSession = async (auto = false) => {
    if (!userSession?.id) return;
    setIsEnding(true);
    // Try to stop and upload recording before ending session
    if (videoRoomRef.current && videoRoomRef.current.stopAndUpload) {
      await videoRoomRef.current.stopAndUpload();
    }
    const { endVideoSession } = await import('@/actions/video-session');
    await endVideoSession(userSession.id);
    window.location.href = "/video-call/create";
    if (!auto) setIsEnding(false);
  };

  // Toggle mic
  const handleToggleMic = () => {
    setMicOn((prev) => {
      if (localTracks[0]) localTracks[0].setEnabled(!prev);
      return !prev;
    });
  };

  // Toggle camera
  const handleToggleCam = () => {
    setCamOn((prev) => {
      if (localTracks[1]) localTracks[1].setEnabled(!prev);
      return !prev;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader text="loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative">
      {/* ALERT BANNER */}


      <VideoRoom
        ref={videoRoomRef}
        micOn={micOn}
        camOn={camOn}
        setLocalTracks={setLocalTracks}
      />

      {/* Only show mic/camera buttons when not loading */}
      {!loading && (
        <div className="flex gap-4 mt-6">
          <Button
            onClick={handleToggleMic}
            className={`px-4 py-2 rounded ${micOn ? "bg-green-500 text-white" : "bg-gray-700 text-gray-300"}`}
          >
            {micOn ? "Mic On" : "Mic Off"}
          </Button>
          <Button
            onClick={handleToggleCam}
            className={`px-4 py-2 rounded ${camOn ? "bg-green-500 text-white" : "bg-gray-700 text-gray-300"}`}
          >
            {camOn ? "Camera On" : "Camera Off"}
          </Button>
        </div>
      )}

      {minutesLeft !== null && (
        <div className="mt-4 text-sm text-gray-600">
          {videoRoomRef.current && videoRoomRef.current.uploadStatus === "uploading"
            ? "Uploading audio..."
            : videoRoomRef.current && videoRoomRef.current.uploadStatus === "success"
              ? "Audio upload complete."
              : videoRoomRef.current && videoRoomRef.current.uploadStatus === "error"
                ? "Audio upload failed."
                : minutesLeft > 0
                  ? `Session ends in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}`
                  : "Session ending..."}
        </div>
      )}

      {userSession && userSession.id ? (
        <Button
          className="mt-6 px-6 py-2 bg-white text-black border border-white rounded hover:bg-gray-200 transition"
          onClick={() => handleEndSession(false)}
          disabled={isEnding}
        >
          {isEnding ? "Ending..." : "End Session"}
        </Button>
      ) : (
        <p className="mt-6 text-gray-400">Loading session...</p>
      )}
    </div>
  );
};

export default MeetingPage;