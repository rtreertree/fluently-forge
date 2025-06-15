"use server";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import * as difflib from "difflib";
import * as fs from "fs";
import _ from "lodash";
import  * as filePushStream from "@/lib/filePushStream"; // Adjust the import path as necessary
import { transcribeAudio } from "@/actions/azureHandler";
import { getRecordings } from "./fileHandler";
import { Readable } from "stream";
import { Uploadable } from "openai/uploads.mjs";
import FormData from 'form-data';
import { readableToBuffer } from "@/lib/audio";


// Define Settings Type
interface Settings {
    filename: string;
    subscriptionKey: string;
    serviceRegion: string;
    language: string;
    dummyFilename?: string;
}

// Define type for recognized word
interface PronunciationAssessment {
    ErrorType: string;
    AccuracyScore?: number;
    ProsodyScore?: number;
}
interface RecognizedWord {
    Word: string;
    Offset?: number;
    Duration?: number;
    PronunciationAssessment: PronunciationAssessment;
}

// Placeholder for settings. 
const settings: Settings = {
    filename: "/Users/tanakornpisuchpen/Downloads/user.wav", // Replace with your audio file path
    subscriptionKey: "Ev9ic97h7lbdJ0bifCg3nOnqkDxwkF6oCUf8hjYpGEnJku9g0EtPJQQJ99BCAC3pKaRXJ3w3AAAYACOG9krp", // Replace with your Azure subscription key
    serviceRegion: "eastasia", // Replace with your Azure service region
    language: "en-US" // Replace with the desired language code
    // dummyFilename?: "<add a path here if needed>"
};


export const startAssessment = async (sessionId: string): Promise<void> => {
    console.log("Starting assessment for session:", sessionId);
    const recordings = await getRecordings(sessionId);
    if (!recordings) {
        console.error("No recordings found for session:", sessionId);
        return;
    }
    const buffer = await readableToBuffer(recordings);
    const transcription = await transcribeAudio(buffer);

    if (!recordings) {
        console.error("No recordings found for session:", sessionId);
        return;
    }
    // generateAssessment(recordings); // required to convert ReadStream to Readable

}


// export const generateAssessment = async (recording: Readable): Promise<void> => {    
//     const transcription = await transcribeAudio(recording);
//     console.log("Transcription result:", transcription);

//     return
//     // now create the audio-config pointing to our stream and
//     // the speech config specifying the language.
//     const wavFileHeader = filePushStream.readWavFileHeader(settings.filename);
//     const format = sdk.AudioStreamFormat.getWaveFormatPCM(wavFileHeader.framerate, wavFileHeader.bitsPerSample, wavFileHeader.nChannels);
//     const audioStream = filePushStream.openPushStream(settings.filename);
//     const audioConfig = sdk.AudioConfig.fromStreamInput(audioStream);
//     const speechConfig = sdk.SpeechConfig.fromSubscription(settings.subscriptionKey, settings.serviceRegion);

//     // You can adjust the segmentation silence timeout based on your real scenario.
//     speechConfig.setProperty(
//         sdk.PropertyId.Speech_SegmentationSilenceTimeoutMs,
//         "1500"
//     );

//     // create pronunciation assessment config, set grading system, granularity and if enable miscue based on your requirement.
//     const pronunciationAssessmentConfig = new sdk.PronunciationAssessmentConfig(
//         transcription,
//         sdk.PronunciationAssessmentGradingSystem.HundredMark,
//         sdk.PronunciationAssessmentGranularity.Phoneme,
//         true
//     );
//     pronunciationAssessmentConfig.enableProsodyAssessment = true;

//     // setting the recognition language to English.
//     speechConfig.speechRecognitionLanguage = settings.language;

//     // create the speech recognizer.
//     const reco = new sdk.SpeechRecognizer(speechConfig, audioConfig);

//     // (Optional) get the session ID
//     reco.sessionStarted = (_s: sdk.Recognizer, e: sdk.SessionEventArgs) => {
//         console.log(`SESSION ID: ${e.sessionId}`);
//     };

//     pronunciationAssessmentConfig.applyTo(reco);

//     type ScoreNumberType = {
//         accuracyScore: number;
//         fluencyScore: number;
//         compScore: number;
//         prosodyScore: number;
//         pronScore?: number;
//         [key: string]: number | undefined;
//     };

//     const scoreNumber: ScoreNumberType = {
//         accuracyScore: 0,
//         fluencyScore: 0,
//         compScore: 0,
//         prosodyScore: 0,
//     };

//     const allWords: RecognizedWord[] = [];
//     let recognizedWordStrList: string[] = [];
//     let startOffset = 0;
//     let endOffset = 0;
//     const prosodyScores: number[] = [];
//     const durations: number[] = [];
//     let jo: Record<string, any> = {};

//     // reco.recognizing = (_s: sdk.Recognizer, e: sdk.SpeechRecognitionEventArgs) => {
//     //     const str = `(recognizing) Reason: ${sdk.ResultReason[e.result.reason]} Text: ${e.result.text}`;
//     //     console.log(str);
//     // };

//     reco.recognized = (_s: sdk.Recognizer, e: sdk.SpeechRecognitionEventArgs) => {
//         console.log("pronunciation assessment for: ", e.result.text);
//         const pronunciation_result = sdk.PronunciationAssessmentResult.fromResult(e.result);
//         console.log(
//             "Accuracy score: ", pronunciation_result.accuracyScore, '\n',
//             "pronunciation score: ", pronunciation_result.pronunciationScore, '\n',
//             "completeness score : ", pronunciation_result.completenessScore, '\n',
//             "fluency score: ", pronunciation_result.fluencyScore, '\n',
//             "prosody score: ", pronunciation_result.prosodyScore
//         );

//         jo = JSON.parse(e.result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult));
//         const nb = jo["NBest"][0];
//         const localtext = _.map(nb.Words, (item: any) => item.Word.toLowerCase());
//         recognizedWordStrList = recognizedWordStrList.concat(localtext);
//         prosodyScores.push(nb.PronunciationAssessment.ProsodyScore);
//         const isSucceeded = jo.RecognitionStatus === 'Success';
//         const nBestWords: RecognizedWord[] = jo.NBest[0].Words;
//         if (isSucceeded && nBestWords) {
//             allWords.push(...nBestWords);
//         }
//         if (startOffset === 0 && nb.Words && nb.Words[0]) {
//             startOffset = nb.Words[0].Offset;
//         }
//         if(nb.Words && nb.Words.length > 0){
//             endOffset = nb.Words.slice(-1)[0].Offset + nb.Words.slice(-1)[0].Duration + 100000;
//         }
//     };

//     function convertReferenceWords(referenceText: string, referenceWords: string[]): string[] {
//         const dictionary = [...new Set(referenceWords)];
//         const maxLength = Math.max(...dictionary.map(word => word.length));

//         // From left to right to do the longest matching to get the word segmentation
//         function leftToRightSegmentation(text: string, dictionary: string[]): string[] {
//             let result: string[] = [];
//             while (text.length > 0) {
//                 let subText: string = "";
//                 if (text.length < maxLength) {
//                     subText = text;
//                 } else {
//                     subText = text.substring(0, maxLength);
//                 }
//                 while (subText.length > 0) {
//                     if (dictionary.includes(subText) || subText.length === 1) {
//                         result.push(subText);
//                         text = text.slice(subText.length);
//                         break;
//                     } else {
//                         subText = subText.slice(0, -1);
//                     }
//                 }
//             }
//             return result;
//         }

//         // From right to left to do the longest matching to get the word segmentation
//         function rightToLeftSegmentation(text: string, dictionary: string[]): string[] {
//             let result: string[] = [];
//             while (text.length > 0) {
//                 let subText: string = "";
//                 if (text.length < maxLength) {
//                     subText = text;
//                 } else {
//                     subText = text.slice(-maxLength);
//                 }
//                 while (subText.length > 0) {
//                     if (dictionary.includes(subText) || subText.length === 1) {
//                         result.push(subText);
//                         text = text.slice(0, -subText.length);
//                         break;
//                     } else {
//                         subText = subText.slice(1);
//                     }
//                 }
//             }
//             result = result.reverse();
//             return result;
//         }

//         function segment_word(referenceText: string, dictionary: string[]): string[] {
//             const leftToRight = leftToRightSegmentation(referenceText, dictionary);
//             const rightToLeft = rightToLeftSegmentation(referenceText, dictionary);

//             if (leftToRight.join("") === referenceText) {
//                 return leftToRight;
//             } else if (rightToLeft.join("") === referenceText) {
//                 return rightToLeft;
//             } else {
//                 console.log("WW failed to segment the text with the dictionary")
//                 if (leftToRight.length < rightToLeft.length) {
//                     return leftToRight;
//                 } else if (leftToRight.length > rightToLeft.length) {
//                     return rightToLeft;
//                 } else {
//                     const leftToRightSingle = leftToRight.filter(word => word.length === 1).length;
//                     const rightToLeftSingle = rightToLeft.filter(word => word.length === 1).length;
//                     if (leftToRightSingle < rightToLeftSingle) {
//                         return leftToRight;
//                     } else {
//                         return rightToLeft;
//                     }
//                 }
//             }
//         }
//         // Remove punctuation from the reference text
//         referenceText = referenceText.split("").filter(char => /[\p{L}\p{N}\s]/u.test(char)).join("");
//         return segment_word(referenceText, dictionary);
//     }

//     async function getReferenceWords(waveFilename: string, referenceText: string, language: string): Promise<string[]> {
//         const audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(waveFilename));
//         const speechConfig = sdk.SpeechConfig.fromSubscription(settings.subscriptionKey, settings.serviceRegion);
//         speechConfig.speechRecognitionLanguage = language;
//         const speechRecognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

//         // Create pronunciation assessment config, set grading system, granularity and if enable miscue based on your requirement.
//         const enableMiscue = true;
//         const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
//             referenceText,
//             sdk.PronunciationAssessmentGradingSystem.HundredMark,
//             sdk.PronunciationAssessmentGranularity.Phoneme,
//             enableMiscue
//         );
//         pronunciationConfig.applyTo(speechRecognizer);

//         const res: string[] = await new Promise((resolve, reject) => {
//             speechRecognizer.recognizeOnceAsync(
//                 (result: sdk.SpeechRecognitionResult) => {
//                     const referenceWords: string[] = [];
//                     if (result.reason == sdk.ResultReason.RecognizedSpeech) {
//                         const jo = JSON.parse(result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult));
//                         _.forEach(jo.NBest[0].Words, (word: RecognizedWord) => {
//                             if (word.PronunciationAssessment.ErrorType != "Insertion") {
//                                 referenceWords.push(word.Word.toLowerCase());
//                             }
//                         });
//                     } else if (result.reason == sdk.ResultReason.NoMatch) {
//                         console.log("No speech could be recognized");
//                         reject([]);
//                         return;
//                     } else if (result.reason == sdk.ResultReason.Canceled) {
//                         console.log(`Speech Recognition canceled: ${result.errorDetails}`);
//                         reject([]);
//                         return;
//                     }
//                     resolve(convertReferenceWords(referenceText, referenceWords));
//                     speechRecognizer.close();
//                 },
//                 (err: any) => {
//                     reject(err);
//                     speechRecognizer.close();
//                 }
//             );
//         });
//         return res;
//     }

//     async function calculateOverallPronunciationScore(): Promise<void> {
//         let referenceWords: string[] = [];

//         const referenceText = transcription.toLocaleLowerCase() ?? "";
//         referenceWords = _.map(
//             _.filter(referenceText.split(" "), (item) => !!item),
//             (item: string) => item.replace(/^[\s!\"#$%&()*+,-./:;<=>?@[\]^_`{|}~]+|[\s!\"#$%&()*+,-./:;<=>?@[\]^_`{|}~]+$/g, "")
//         );

//         // Diff sequence
//         const diff = new difflib.SequenceMatcher(null, referenceWords, recognizedWordStrList);
//         const lastWords: RecognizedWord[] = [];

//         for (const d of diff.getOpcodes()) {
//             if (d[0] == "insert" || d[0] == "replace") {
//                 for (let j = d[3]; j < d[4]; j++) {
//                     if (allWords && allWords.length > 0 && allWords[j].PronunciationAssessment.ErrorType !== "Insertion") {
//                         allWords[j].PronunciationAssessment.ErrorType = "Insertion";
//                     }
//                     lastWords.push(allWords[j]);
//                 }
//             }
//             if (d[0] == "delete" || d[0] == "replace") {
//                 if (
//                     d[2] == referenceWords.length &&
//                     !(
//                         jo.RecognitionStatus == "Success" ||
//                         jo.RecognitionStatus == "Failed"
//                     )
//                 )
//                     continue;
//                 for (let i = d[1]; i < d[2]; i++) {
//                     const word: RecognizedWord = {
//                         Word: referenceWords[i],
//                         PronunciationAssessment: {
//                             ErrorType: "Omission",
//                         },
//                     };
//                     lastWords.push(word);
//                 }
//             }
//             if (d[0] == "equal") {
//                 for (let k = d[3], count = 0; k < d[4]; count++) {
//                     lastWords.push(allWords[k]);
//                     k++;
//                 }
//             }
//         }

//         const accuracyScores: number[] = [];
//         const handledLastWords: string[] = [];
//         let validWordCount = 0;
//         _.forEach(lastWords, (word: RecognizedWord) => {
//             if (word && word.PronunciationAssessment.ErrorType != "Insertion") {
//                 accuracyScores.push(Number(word.PronunciationAssessment.AccuracyScore ?? 0));
//                 handledLastWords.push(word.Word);
//             }
//             if (word.PronunciationAssessment.ErrorType == "None" && (word.PronunciationAssessment.AccuracyScore ?? 0) >= 0) {
//                 validWordCount++;
//                 durations.push(Number(word.Duration) + 100000);
//             }
//         });
//         // Calculate whole completeness score
//         let compScore = handledLastWords.length > 0 ? Number(((validWordCount / handledLastWords.length) * 100).toFixed(2)) : 0;
//         scoreNumber.compScore = compScore > 100 ? 100 : compScore;
//         // We can calculate whole accuracy by averaging
//         scoreNumber.accuracyScore = Number((_.sum(accuracyScores) / accuracyScores.length).toFixed(2));
//         // Re-calculate fluency score
//         if (startOffset > 0) {
//             scoreNumber.fluencyScore = Number((_.sum(durations) / (endOffset - startOffset) * 100).toFixed(2));
//         }
//         // Re-calculate the prosody score by averaging
//         scoreNumber.prosodyScore = Number((_.sum(prosodyScores) / prosodyScores.length).toFixed(2));
//         const sortScore = Object.keys(scoreNumber).sort(function (a, b) {
//             return (scoreNumber[a] ?? 0) - (scoreNumber[b] ?? 0);
//         });
//         scoreNumber.pronScore = Number(
//             (
//                 (scoreNumber[sortScore[0]] ?? 0) * 0.4 +
//                 (scoreNumber[sortScore[1]] ?? 0) * 0.2 +
//                 (scoreNumber[sortScore[2]] ?? 0) * 0.2 +
//                 (scoreNumber[sortScore[3]] ?? 0) * 0.2
//             ).toFixed(2)
//         );
//         console.log(
//             "    Paragraph pronunciation score: ", scoreNumber.pronScore,
//             ", accuracy score: ", scoreNumber.accuracyScore,
//             ", completeness score: ", scoreNumber.compScore,
//             ", fluency score: ", scoreNumber.fluencyScore,
//             ", prosody score: ", scoreNumber.prosodyScore
//         );
//         _.forEach(lastWords, (word: RecognizedWord, ind: number) => {
//             console.log(
//                 "    ", ind + 1, ": word: ", word.Word,
//                 "\taccuracy score: ", word.PronunciationAssessment.AccuracyScore,
//                 "\terror type: ", word.PronunciationAssessment.ErrorType, ";"
//             );
//         });
//     }

//     reco.canceled = (_s: sdk.Recognizer, e: sdk.SpeechRecognitionCanceledEventArgs) => {
//         if (e.reason === sdk.CancellationReason.Error) {
//             const str = `(cancel) Reason: ${sdk.CancellationReason[e.reason]}: ${e.errorDetails}`;
//             console.log(str);
//         }
//         reco.stopContinuousRecognitionAsync();
//     };

//     reco.sessionStopped = (_s: sdk.Recognizer, _e: sdk.SessionEventArgs) => {
//         reco.stopContinuousRecognitionAsync();
//         reco.close();
//         calculateOverallPronunciationScore();
//     };

//     reco.startContinuousRecognitionAsync();
// };