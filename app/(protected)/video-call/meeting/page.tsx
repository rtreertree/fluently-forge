"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { VideoRoom } from "../../_components/video_session/room";

const MeetingPage = () => {
  const searchParams = useSearchParams();
  const channel = searchParams.get("channel") || "default";
  const token = searchParams.get("token") || "";
  const [camOn] = useState(true);
  const [micOn] = useState(true);

  return (
    <div>
      <VideoRoom></VideoRoom>
    </div>
  );
};

export default MeetingPage;