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

  // Fetch user's session on mount and when session updates
  useEffect(() => {
    const fetchSession = async () => {
      const userId = session?.user?.id;
      if (!userId) return;
      const sessionData = await getUserVideoSession(userId);
      setUserSession(sessionData);
    };
    fetchSession();
  }, [session?.user?.id]);

  // Function to end video session
  const handleEndSession = async () => {
    if (!userSession?.id) return; // Ensure session ID exists
    setIsEnding(true);
    const { endVideoSession } = await import('@/actions/video-session');
    await endVideoSession(userSession.id);
    window.location.href = "/video-call/create";
  };

  return (
    <div>
      <VideoRoom />
      
      {userSession && userSession.id ? (
        <Button
          className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          onClick={handleEndSession}
          disabled={isEnding}
        >
          End Session
        </Button>
      ) : (
        <p>Loading session...</p>
      )}
    </div>
  );
};

export default MeetingPage;