"use client";
import { useState, useEffect } from "react";
import { VideoRoom } from "../../_components/video_session/room";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { getUserVideoSession } from "@/actions/video-session";

const MeetingPage = () => {
  const { data: session } = useSession();
  const [userSession, setUserSession] = useState<any>(null);
  const [isEnding, setIsEnding] = useState(false);

  // Mic/camera state
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  // Store local tracks for toggling
  const [localTracks, setLocalTracks] = useState<[any, any]>([null, null]);

  useEffect(() => {
    const fetchSession = async () => {
      const userId = session?.user?.id;
      if (!userId) return;
      const sessionData = await getUserVideoSession(userId);
      setUserSession(sessionData);
    };
    fetchSession();
  }, [session?.user?.id]);

  const handleEndSession = async () => {
    if (!userSession?.id) return;
    setIsEnding(true);
    const { endVideoSession } = await import('@/actions/video-session');
    await endVideoSession(userSession.id);
    window.location.href = "/video-call/create";
  };

  // Toggle mic
  const handleToggleMic = () => {
    if (localTracks[0]) {
      localTracks[0].setEnabled(!micOn);
      setMicOn(!micOn);
    }
  };

  // Toggle camera
  const handleToggleCam = () => {
    if (localTracks[1]) {
      localTracks[1].setEnabled(!camOn);
      setCamOn(!camOn);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 ">
      <VideoRoom
        micOn={micOn}
        camOn={camOn}
        setLocalTracks={setLocalTracks}
      />

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

      {userSession && userSession.id ? (
        <Button
          className="mt-6 px-6 py-2 bg-white text-black border border-white rounded hover:bg-gray-200 transition"
          onClick={handleEndSession}
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