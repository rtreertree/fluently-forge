"use client";

import React from "react";
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

const SessionAgent = ({ session }: SessionAgentProps) => {
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
        <h1 className="text-2xl font-bold mb-4 pt-2">{`${micOn}${status}`}</h1>

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
    </div>
    );
};

export function ShineCard({ children }: { children: React.ReactNode }) {
    return (
        <div className="group relative size-80 overflow-hidden flex flex-col items-center gap-2 justify-center border rounded-[1rem] p-2">
            {children}
            <div className="absolute inset-0 flex w-full h-full justify-center items-center z-10 [transform:translateX(-130%)_skew(25deg)] duration-1000 group-hover:duration-1000 group-hover:[transform:translateX(130%)_skew(15deg)]">
                <div className="w-20 h-full bg-primary/40 blur-[80px]"></div>
            </div>
        </div>
    );
}

export default SessionAgent;
