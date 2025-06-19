"use client";

import SessionCreateCard from "../../_components/session/session-create-card";
import VideoCallSessionCreateCard from "../../_components/session/video-call-session-create-card";
const CreateSessionPage = () => {
    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 p-5 min-h-screen">
            <SessionCreateCard type={"SMALLTALK"} />
            <SessionCreateCard type={"SCENARIO_CREATION"} />
            <VideoCallSessionCreateCard />
            <SessionCreateCard type={"MONOLOGUE"} />
        </div>
    );
};

export default CreateSessionPage;