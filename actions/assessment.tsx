"use server";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import * as fs from "fs";

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

export async function assessPronunciation(script: string, audioBuffer?: Buffer): Promise<PronunciationAssessmentWord[]> {
    // Set up SDK configuration from environment
    const subscriptionKey = process.env.AZURE_SUBSCRIPTION_KEY || "";
    const serviceRegion = process.env.AZURE_REGION || "eastasia";
    const language = "en-US";

    if (!audioBuffer) {
        audioBuffer = fs.readFileSync("tmp/testaudio.wav");
    }

    const audioConfig: sdk.AudioConfig = sdk.AudioConfig.fromWavFileInput(audioBuffer);
    const speechConfig: sdk.SpeechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
    speechConfig.speechRecognitionLanguage = language;

    const pronunciationAssessmentConfig = new sdk.PronunciationAssessmentConfig(
        "",
        sdk.PronunciationAssessmentGradingSystem.HundredMark,
        sdk.PronunciationAssessmentGranularity.Word,
        true
    );
    pronunciationAssessmentConfig.enableProsodyAssessment = true;

    const reco = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    pronunciationAssessmentConfig.applyTo(reco);

    let masterWordList: PronunciationAssessmentWord[] = [];

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
                    masterWordList.push(...detailResult.Words);
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