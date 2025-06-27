"use client";

import { startAssessment } from "@/actions/assessment";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import ChatBoxComponent from "@/app/(protected)/_components/session/assessment/chatbox";
import { agentPlaceholder, userPlaceholder } from "@/actions/placeholder";
import { MergedTranscription, mergeTranscriptions } from "@/actions/azureHandler";

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

    return (
        <div className="flex flex-col items-center justify-center">
            {
                !transcription ? (
                    <div className="text-center text-gray-500">Loading session details...</div>
                ) : (
                    <ChatBoxComponent messages={transcription}/>
                )
            }
        </div>
    );
}