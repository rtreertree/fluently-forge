"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import TranscriptionChat from "@/app/(protected)/_components/session/assessment/chatbox";
import CommentBox from "@/app/(protected)/_components/session/assessment/commmetbox";
import { MergedTranscription, mergeTranscriptions, transcribeAudioMerged } from "@/actions/azureHandler";
import { getAssessmentFromDB, getTranscriptionFromDB } from "@/actions/assessment";
import { set } from "lodash";

export default function SessionDetails() {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");
    const [transcription, setTranscription] = useState<MergedTranscription[]>();

    useEffect(() => {
        if (!id) {
            window.location.href = "/session/create";
            return;
        }

        getTranscriptionFromDB(id).then((data) => {
            console.log("Fetched transcription data:", data);
            setTranscription(data);
        });

        console.log("Fetching session details for ID:", id);
    }, [id]);

    console.log("Session ID:", id);

    const onTestAssessment = async () => {
        if (!id) return;
        const words = await transcribeAudioMerged(id);
        console.log("Pronunciation Assessment Words:", words);
    }

    return (
        <div className="flex flex-row items-center justify-center gap-7 p-10">
            {
                !transcription ? (
                    <div className="text-center text-gray-500">Loading session details...</div>
                ) : (
                    <TranscriptionChat messages={transcription}/>
                )
            }
            <CommentBox/>
            {/* <button onClick={onTestAssessment}>testAssessment</button> */}
        </div>
    );
}