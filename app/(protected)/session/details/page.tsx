"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import TranscriptionChat from "@/app/(protected)/_components/session/assessment/chatbox";
import CommentBox from "@/app/(protected)/_components/session/assessment/commmetbox";
import { MergedTranscription, mergeTranscriptions, transcribeAudioMerged } from "@/actions/azureHandler";
import { generateSuggestion, getAssessmentFromDB, getTranscriptionFromDB, Recommendation, startAssessmentPipeline } from "@/actions/assessment";
import { set } from "lodash";

export default function SessionDetails() {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");
    const [transcription, setTranscription] = useState<MergedTranscription[] | string>();
    const [recommendations, setRecommendations] = useState<Recommendation[]>();
    const [scores, setScores] = useState<{
        Accuracy: number,
        Fluency: number,
        Prosody: number,
        PronScore: number
    }>();

    useEffect(() => {
        if (!id) {
            window.location.href = "/session/create";
            return;
        }

        getTranscriptionFromDB(id).then(({ transcription, recommendations, pronunciation}) => {
            console.log("Fetched transcription data:", transcription);
            setTranscription(transcription);
            setRecommendations(recommendations);
            setScores(pronunciation);
        });

        console.log("Fetching session details for ID:", id);
    }, [id]);

    console.log("Session ID:", id);

    const onTestAssessment = async () => {
        if (!id) return;
        // const words = await transcribeAudioMerged(id);

        await startAssessmentPipeline(id);
        // console.log("Pronunciation Assessment Words:", words);
    }

    return (
        <div className="flex flex-row items-center justify-center gap-7 p-10">
            {
                !transcription || !recommendations || !scores? (
                    <div className="text-center text-gray-500">Loading session details...</div>
                ) : (
                    <>
                        <TranscriptionChat messages={transcription}/>
                        <CommentBox comments={recommendations} scores={scores} />
                    </>
                )
            }
            {/* <button onClick={onTestAssessment}>testAssessment</button> */}
        </div>
    );
}