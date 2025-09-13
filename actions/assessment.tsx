"use server";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import * as fs from "fs";
import { AssessedUtterance } from "@/lib/iassessment";
import { db } from "@/lib/db";
import { MergedTranscription } from "./azureHandler";

export interface PronunciationAssessmentWord {
    Word: string;
    PronunciationAssessment: {
        AccuracyScore: number;
        ErrorType: string;
    };
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
                    console.log("Parsed detailResult:", detailResult);
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

export async function getTranscriptionFromDB(sessinID: string) {
    const resp = await db.sessions.findFirst({
        where: {
            id: sessinID
        },
        select: {
            transcript: true,
        }
    });

    if (!resp || !resp.transcript) {
        throw new Error("No transcription data found for the given session ID.");
    }

    const data: MergedTranscription[] = JSON.parse(resp.transcript);
    return data;
}