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

  return (
    <div className="min-h-screen   flex flex-col items-center justify-center px-4 py-8">
      <VideoRoom />

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
