"use client";

import { useParams } from "next/navigation";
import { SessionAIAgent } from "@/app/(protected)/_components/session/session-ai-agent";
import CircleWaveform from "@/app/(protected)/_components/session/ai-agent";

export default function ActiveSession(){
    const router = useParams();
    const { id } = router;

    
    return (
        <div className="flex h-full flex-col items-center justify-center bg-slate-800">
            <div className="space-y-10 text-center">
                <h1 className="text-6xl font-bold text-accent">This is a session page</h1>
                <p className="text-3xl font-semi-bold text-accent p-7">Session ID: {id}</p>
                {/* <SessionAIAgent/> */}
                <CircleWaveform />
            </div>
        </div>
    );
};