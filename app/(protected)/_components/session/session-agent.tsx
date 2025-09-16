"use client";

import React, { useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import useWebRTCAudioSession from "@/hooks/use-webrtc";
import { Button } from "@/components/ui/button";
import RadialVolumeBars from "./session-radialbars";
import { sessions } from "@prisma/client";
import { useRouter } from "next/navigation";

// Constants for bar config
const SVG_SIZE = 300;

interface SessionAgentProps {
    session: sessions
}

export default function SessionAgent ({ session }: SessionAgentProps) {
    const router = useRouter();

    const {
        currentVolume,
        isSessionActive,
        micOn,
        isPending,
        status,
        handleStartStopClick,
        stopSession,
        setMicOnOff,
    } = useWebRTCAudioSession("alloy", undefined, session);

    const micOnClick = () => {
        if (!isSessionActive) return;
        setMicOnOff(!micOn);
    };

    const handleButtonClick = () => {
        if (isSessionActive) {
            stopSession().then(() => {
                router.push("/session/list");
            });
        } else {
            handleStartStopClick();
        }
    };

    return (
        <div className="w-full max-w-md border text-center flex flex-col items-center justify-center p-6 rounded-2xl shadow-md bg-background">
            
            <div
                className="flex items-center justify-center relative"
                style={{ width: `${SVG_SIZE}px`, height: `${SVG_SIZE}px` }}
            >
                <button
                    type="button"
                    aria-label={micOn && !isPending ? "Mute microphone" : "Unmute microphone"}
                    onClick={micOnClick}
                    disabled={!isSessionActive}
                    className="z-10 absolute bg-transparent border-none"
                >
                    {micOn && !isPending ? (
                        <Mic size={28} className="text-black dark:text-white" />
                    ) : (
                        <MicOff size={28} className="text-black dark:text-white" />
                    )}
                </button>

                <RadialVolumeBars volume={currentVolume} isActive={isSessionActive} />

                <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-primary-foreground dark:bg-primary blur-[120px]" />
            </div>

            <Button onClick={handleButtonClick} disabled={isPending} className="mt-6 w-32">
                {isSessionActive ? "Stop Session" : "Start"}
            </Button>

            {status || true ? <h1 className="text-lg font-medium mt-4 w-[400px] ">{`status [${status}]`}</h1> : null}
        </div>
    );
};