"use server";


import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { db } from "@/lib/db";
import { MergedTranscription, monologueAssessment, transcribeAudioMerged, TranscriptionResponse } from "./azureHandler";
import { openaiClient } from "@/lib/openai";
import * as zod from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { assessmentRecommendationPrompt, monologueRecommendationPrompt } from "@/data/prompts";

export interface PronunciationAssessmentWord {
    Word: string;
    PronunciationAssessment: {
        AccuracyScore: number;
        ErrorType: string;
    };
}

export interface PronunciationAssessmenDB {
    offsetMilliseconds: number;
    durationMilliseconds: number;
    text: string;
    locale: string;
    confidence: number;
    words: {
        offsetMilliseconds: number;
        durationMilliseconds: number;
        text: string;
    }[];
    assessment: PronunciationAssessmentDetailResult[]; // Replace 'any' with the actual assessment type if available
}

export interface PronunciationAssessmentResult {
    AccuracyScore: number;
    FluencyScore: number;
    ProsodyScore: number;
    CompletenessScore: number;
    PronScore: number;
}

export interface PronunciationAssessmentDetailResult {
    Confidence: number;
    Lexical: string;
    MaskedITN: string;
    Display: string;
    PronunciationAssessment: PronunciationAssessmentResult;
    Words: PronunciationAssessmentWord[];
}

export async function assessPronunciation(script: string, audioBuffer?: Buffer): Promise<PronunciationAssessmentDetailResult[]> {
    // Set up SDK configuration from environment
    const subscriptionKey = process.env.AZURE_SUBSCRIPTION_KEY || "";
    const serviceRegion = process.env.AZURE_REGION || "eastasia";
    const language = "en-US";

    if (!audioBuffer) {
        throw "Audio buffer is not provided";
    }

    const audioConfig: sdk.AudioConfig = sdk.AudioConfig.fromWavFileInput(audioBuffer);
    const speechConfig: sdk.SpeechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
    speechConfig.speechRecognitionLanguage = language;

    const pronunciationAssessmentConfig = new sdk.PronunciationAssessmentConfig(
        script,
        sdk.PronunciationAssessmentGradingSystem.HundredMark,
        sdk.PronunciationAssessmentGranularity.Word,
        true
    );
    pronunciationAssessmentConfig.enableProsodyAssessment = true;

    const reco = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    pronunciationAssessmentConfig.applyTo(reco);

    let masterWordList: PronunciationAssessmentDetailResult[] = [];

    await new Promise<void>((resolve, reject) => {
        reco.recognized = (_s, event) => {
            const result = event.result;
            if (result.reason === sdk.ResultReason.RecognizedSpeech) {
                const pronunciation_result = sdk.PronunciationAssessmentResult.fromResult(result);
                let detailResult: PronunciationAssessmentDetailResult | undefined;
                try {
                    detailResult = JSON.parse(JSON.stringify(pronunciation_result.detailResult));
                } catch (_err) { /* ignore parse error */ }

                if (detailResult) {
                    masterWordList.push(detailResult);
                }
            }
        };

        reco.sessionStopped = () => {
            reco.stopContinuousRecognitionAsync(
                () => resolve(),
                (err) => reject(err)
            );
        };

        reco.canceled = (_s, event) => {
            if (event.reason === sdk.CancellationReason.EndOfStream) {
                reco.stopContinuousRecognitionAsync(() => resolve(), (err) => reject(err));
            } else {
                reco.stopContinuousRecognitionAsync(
                    () => reject(new Error(event.errorDetails || "Recognition canceled (error)!")),
                    (err) => reject(err)
                );
            }
        };

        reco.startContinuousRecognitionAsync();
    });

    return masterWordList;
}

export async function getAssessmentFromDB(sessinID: string) {
    const resp = await db.sessions.findFirst({
        where: {
            id: sessinID
        },
        select: {
            assessedDetail: true,
        }
    });

    if (!resp || !resp.assessedDetail) {
        throw new Error("No assessment data found for the given session ID.");
    }

    const data: PronunciationAssessmentDetailResult[] = JSON.parse(resp.assessedDetail);
    return data;
}

export async function getTranscriptionFromDB(sessionID: string) {
    const resp = await db.sessions.findFirst({
        where: {
            id: sessionID
        },
        select: {
            transcript: true,
            aiSuggestions: true,
            assessedDetail: true,
            type: true,
        }
    });

    if (!resp ) {
        throw new Error("No response data found for the given session ID.");
    }

    if (!resp.transcript) {
        throw new Error("No transcription data found for the given session ID.");
    }

    console.log("Raw suggestions from DB:", resp.aiSuggestions);
    if (!resp.aiSuggestions) {
        throw new Error("No AI suggestions found for the given session ID.");
    }

    if (!resp.assessedDetail) {
        throw new Error("No assessed detail found for the given session ID.");
    }



    // const transcription: MergedTranscription[] = JSON.parse(resp.transcript);
    const recommendations: Recommendation[] = JSON.parse(resp.aiSuggestions);
    const assessedDetail: PronunciationAssessmenDB[] = JSON.parse(resp.assessedDetail);


    let totalCount = 0;
    let totalAccuracy = 0;
    let totalFluency = 0;
    let totalProsody = 0;
    let totalCompleteness = 0;
    let totalPronScore = 0;


    // find mean accuracy score for each assessedDetail item and add to transcription item
    assessedDetail.forEach((t) => {
        t.assessment.forEach((a) => {
            totalCount++;
            totalAccuracy += a.PronunciationAssessment.AccuracyScore;
            totalFluency += a.PronunciationAssessment.FluencyScore;
            totalProsody += a.PronunciationAssessment.ProsodyScore;
            totalCompleteness += a.PronunciationAssessment.CompletenessScore;
            totalPronScore += a.PronunciationAssessment.PronScore;
        });
    });

    const round = (num: number) => Math.round(num * 100) / 100;

    const Accuracy = totalCount ? round(totalAccuracy / totalCount) : 0;
    const Fluency = totalCount ? round(totalFluency / totalCount) : 0;
    const Prosody = totalCount ? round(totalProsody / totalCount) : 0;
    const Completeness = totalCount ? round(totalCompleteness / totalCount) : 0;
    const PronScore = totalCount ? round(totalPronScore / totalCount) : 0;


    if (resp.type === "MONOLOGUE") {
        const transcription = resp.transcript;
        return { transcription, recommendations, pronunciation: { Accuracy, Fluency, Prosody, PronScore } };

    } else {
        const transcription: MergedTranscription[] = JSON.parse(resp.transcript);
        return { transcription, recommendations, pronunciation: { Accuracy, Fluency, Prosody, PronScore } };
    }
}

export interface Recommendation {
    original: string;
    improved: string;
    reason: string;
}

const recommendationsZod = zod.object({
        recommendation: zod.array(zod.object({
            original: zod.string(),
            improved: zod.string(),
            reason: zod.string(),
        })).min(3, "At least 3 recommendations are required").max(15, "No more than 15 recommendations are allowed"),
});

export async function generateSuggestion(transcription: MergedTranscription[]): Promise<Recommendation[]> {    

    // Call OpenAI with structured parsing
    const completion = await openaiClient.responses.parse({
        model: "gpt-5",
        input: [
            {
                role: "system",
                content: assessmentRecommendationPrompt(),
            },
            {
                role: "user",
                content: JSON.stringify(transcription),
            },
        ],
        text: {
            format: zodTextFormat(recommendationsZod, "recommendation"),
        },
    });

    // Parse structured response
    const parsedResponse = completion.output_parsed;
    if (!parsedResponse) {
        throw new Error("Error parsing response");
    }

    return parsedResponse.recommendation;
}

export async function monologueSuggestion(transcription: string, sessionId: string) {
    const session = await db.sessions.findFirst({
        where: { id: sessionId },
        select: {
            userId: true,
            topic: true,
            type: true,
            question: true,
            assessedDetail: true,
            transcript: true,
            assessmentStatus: true,
        },
    });

    if (!session) {
        throw new Error("Session not found");
    }
;

    // Call OpenAI with structured parsing
    const completion = await openaiClient.responses.parse({
        model: "gpt-5",
        input: [
            {
                role: "system",
                content: monologueRecommendationPrompt(session.question || ""),
            },
            {
                role: "user",
                content: transcription,
            },
        ],
        text: {
            format: zodTextFormat(recommendationsZod, "recommendation"),
        },
    });

    // Parse structured response
    const parsedResponse = completion.output_parsed;
    if (!parsedResponse) {
        throw new Error("Error parsing response");
    }

    return parsedResponse.recommendation;
}


export async function startAssessmentPipeline(sessionId: string) {
    console.log("Starting assessment pipeline for session:", sessionId);

    const session = await db.sessions.update({
        where: { id: sessionId },
        data: {
            status: "PENDING", // or whatever new status you want
        },
        select: {
            userId: true,
            topic: true,
            type: true,
            assessedDetail: true,
            transcript: true,
            assessmentStatus: true,
        },
    });

    if (!session) {
        throw new Error("Session not found");
    }

    if (session.type === "SCENARIO_CREATION" || session.type === "SMALLTALK") {
        await transcribeAudioMerged(sessionId);
    }

    if (session.type === "MONOLOGUE") {
        await monologueAssessment(sessionId);
    }

}