"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import ChatBoxComponent from "@/app/(protected)/_components/session/assessment/chatbox";
import { agentPlaceholder, userPlaceholder } from "@/actions/placeholder";
import { MergedTranscription, mergeTranscriptions } from "@/actions/azureHandler";
import { assessPronunciation } from "@/actions/assessment";

export default function SessionDetails() {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");
    const [transcription, setTranscription] = useState<MergedTranscription[]>();

    useEffect(() => {
        if (!id) {
            window.location.href = "/session/create";
            return;
        }
        console.log("Fetching session details for ID:", id);

        mergeTranscriptions(agentPlaceholder, userPlaceholder).then((merged) => {
            setTranscription(merged);
        });
    }, [id]);

    console.log("Session ID:", id);

    const onTestAssessment = async () => {
        const words = await assessPronunciation("Hello world, this is a test.", undefined);
        console.log("Pronunciation Assessment Words:", words);
    }

    return (
        <div className="flex flex-col items-center justify-center">
            {
                !transcription ? (
                    <div className="text-center text-gray-500">Loading session details...</div>
                ) : (
                    <ChatBoxComponent messages={transcription}/>
                )
            }
            <button onClick={onTestAssessment}>testAssessment</button>
        </div>
    );
}