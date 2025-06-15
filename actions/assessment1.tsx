"use server";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import * as difflib from "difflib";
import * as fs from "fs";
import _ from "lodash";

// Define Settings Type
interface Settings {
    filename: string;
    subscriptionKey: string;
    serviceRegion: string;
    language: string;
}

// Placeholder for settings. 
const settings: Settings = {
    filename: "/Users/tanakornpisuchpen/Program/fluently-forge/tmp/testaudio_long.wav", // Replace with your audio file path
    subscriptionKey: "Ev9ic97h7lbdJ0bifCg3nOnqkDxwkF6oCUf8hjYpGEnJku9g0EtPJQQJ99BCAC3pKaRXJ3w3AAAYACOG9krp", // Replace with your Azure subscription key
    serviceRegion: "eastasia", // Replace with your Azure service region
    language: "en-US" // Replace with the desired language cod
} // Expect external "settings" definition

// Define types for word-level details
interface PronunciationAssessmentWord {
    Word: string;
    PronunciationAssessment: {
        AccuracyScore: number;
        ErrorType: string;
    };
}

interface PronunciationAssessmentDetailResult {
    Words: PronunciationAssessmentWord[];
}

export const testAssessment = async (): Promise<void> => {
    // Prepare audio config from WAV buffer
    const audioBuffer: Buffer = fs.readFileSync(settings.filename);
    const audioConfig: sdk.AudioConfig = sdk.AudioConfig.fromWavFileInput(audioBuffer);

    // Prepare speech config
    const speechConfig: sdk.SpeechConfig = sdk.SpeechConfig.fromSubscription(
        settings.subscriptionKey,
        settings.serviceRegion
    );

    const reference_text = "What's the weather like?";

    // Pronunciation assessment config
    const pronunciationAssessmentConfig = new sdk.PronunciationAssessmentConfig(
        "",
        sdk.PronunciationAssessmentGradingSystem.HundredMark,
        sdk.PronunciationAssessmentGranularity.Phoneme,
        true
    );
    pronunciationAssessmentConfig.enableProsodyAssessment = true;

    // Set recognition language
    speechConfig.speechRecognitionLanguage = settings.language;

    // Speech recognizer
    const reco: sdk.SpeechRecognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    reco.sessionStarted = (_s, e: sdk.SessionEventArgs) => {
        console.log(`SESSION ID: ${e.sessionId}`);
    };
    pronunciationAssessmentConfig.applyTo(reco);

    function onRecognizedResult(result: sdk.SpeechRecognitionResult): void {
        console.log("pronunciation assessment for: ", result.text);
        const pronunciation_result = sdk.PronunciationAssessmentResult.fromResult(result);
        // Type assertion due to potential SDK differences; it may be necessary to check object structure at runtime.
        const detailResult = pronunciation_result.detailResult as PronunciationAssessmentDetailResult;

        console.log(
            " Accuracy score: ", pronunciation_result.accuracyScore, '\n',
            "pronunciation score: ", pronunciation_result.pronunciationScore, '\n',
            "completeness score : ", pronunciation_result.completenessScore, '\n',
            "fluency score: ", pronunciation_result.fluencyScore, '\n',
            "prosody score: ", pronunciation_result.prosodyScore
        );
        console.log("  Word-level details:");
        _.forEach(detailResult.Words, (word: PronunciationAssessmentWord, idx: number) => {
            console.log(
                "    ", idx + 1, ": word: ", word.Word,
                "\taccuracy score: ", word.PronunciationAssessment.AccuracyScore,
                "\terror type: ", word.PronunciationAssessment.ErrorType, ";"
            );
        });
        reco.close();
    }

    await new Promise<void>((resolve, reject) => {
        reco.recognizeOnceAsync(
            function (successfulResult: sdk.SpeechRecognitionResult) {
                try {
                    onRecognizedResult(successfulResult);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            },
            function (err: string) {
                console.error("Recognition error:", err);
                reco.close();
                reject(err);
            }
        );
    });
};