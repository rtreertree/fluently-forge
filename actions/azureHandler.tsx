"use server";

import FormData, { Readable } from 'form-data';
import { getRecordings } from './fileHandler';
import { audioBufferToWavBlob, bufferToAudioBuffer, readableToBuffer, cutRawAudioBuffer, decodeWavToRawAudioBuffer, encodeRawAudioBufferToWav, RawAudioBuffer } from '@/lib/audio';
import { assessPronunciation, generateSuggestion, monologueSuggestion, PronunciationAssessmenDB, PronunciationAssessmentWord } from './assessment';
import { db } from '@/lib/db';

import axios from 'axios';

export interface TranscriptionResponse {
    offsetMilliseconds: number;
    durationMilliseconds: number;
    text: string;
    locale: string;
    confidence: number;
    words: {
        offsetMilliseconds: number;
        durationMilliseconds: number;
        text: string;
    }[]
}

export interface MergedTranscription {
    text: string;
    speaker: number;
}


async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            if (i < retries - 1) await new Promise(res => setTimeout(res, delay));
        }
    }
    throw lastErr;
}

export const mergeTranscriptions = async (
    agent: TranscriptionResponse[],
    user: TranscriptionResponse[]
): Promise<MergedTranscription[]> => {
    // Step 1: Add speaker number and flatten arrays
    const tagged1 = agent.map(item => ({
        text: item.text,
        speaker: 1,
        offsetMilliseconds: item.offsetMilliseconds
    }));

    const tagged2 = user.map(item => ({
        text: item.text,
        speaker: 2,
        offsetMilliseconds: item.offsetMilliseconds
    }));

    // Step 2: Merge and sort by offset
    const combined = [...tagged1, ...tagged2].sort(
        (a, b) => a.offsetMilliseconds - b.offsetMilliseconds
    );

    // Step 3: Merge consecutive items from the same speaker
    const merged: MergedTranscription[] = [];
    for (const item of combined) {
        const last = merged[merged.length - 1];
        if (last && last.speaker === item.speaker) {
            // Merge text if same speaker
            last.text += ' ' + item.text;
        } else {
            // Otherwise push as new entry
            merged.push({ text: item.text, speaker: item.speaker });
        }
    }

    return merged;
}

const getAzureConfig = () => {
    const SUBSCRIPTION_KEY = process.env.AZURE_SUBSCRIPTION_KEY2;
    const REGION = process.env.AZURE_REGION;
    const STT_ENDPOINT = process.env.AZURE_STT_ENDPOINT;

    if (!SUBSCRIPTION_KEY || !REGION) {
        throw new Error("Azure subscription ID or region is not set in environment variables.");
    }

    return {
        SUBSCRIPTION_KEY,
        REGION,
        STT_ENDPOINT
    };
}



export const transcribeAudio = async (audioBuffer: Buffer) => {
    const { SUBSCRIPTION_KEY, REGION, STT_ENDPOINT } = getAzureConfig();
    const BASE_URL = `${STT_ENDPOINT}/speechtotext/transcriptions:transcribe?api-version=2024-11-15`;

    console.log("Transcribing audio with Azure Speech Service...");

    const form = new FormData();
    form.append('audio', audioBuffer, {
        filename: 'audio.wav',
        contentType: 'audio/wav',
    });

    form.append('definition', JSON.stringify({
        locales: ["en-US"],
    }));

    const result = await axios.post(BASE_URL, form, {
        onUploadProgress: (progressEvent) => {
            if (progressEvent.total === undefined) {
                console.warn("Total size is not available for upload progress.");
                return;
            }
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Upload progress: ${percentCompleted}%`);
        },

        onDownloadProgress: (progressEvent) => {
            if (progressEvent.total === undefined) {
                console.warn("Total size is not available for download progress.");
                return;
            }
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Download progress: ${percentCompleted}%`);
        },

        headers: {
            'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
            'Content-Type': `multipart/form-data; boundary=${form.getBoundary()}`,
        }
    }).catch((err) => {
        console.error(err.response)
    })

    if (!result || !result.data || !result.data.phrases) {
        throw new Error("Failed to transcribe audio. No phrases returned from Azure.");
    }

    return result.data.phrases as TranscriptionResponse[];
}


export const transcribeAudioMerged = async (
    sessionId: string
) => {
    const log = (step: string, msg: string) =>
        console.log(`[transcribeAudioMerged][${sessionId}][${step}] ${msg}`);

    try {
        const fetchRecordingBuffer = async (role: "user" | "agent") => {
            const readable = await getRecordings(sessionId, role);
            if (!readable) throw new Error(`Failed to retrieve ${role} recording.`);
            log("fetch", `${role} recording retrieved.`);
            const buffer = await readableToBuffer(readable);
            readable.destroy();
            return buffer;
        };

        // Step 1: fetch both recordings
        const [userBuffer, agentBuffer] = await Promise.all([
            fetchRecordingBuffer("user"),
            fetchRecordingBuffer("agent"),
        ]);

        // Step 2: transcribe with retry
        log("transcribe", "Starting transcription...");
        const [userTranscription, agentTranscription] = await Promise.all([
            withRetry(() => transcribeAudio(userBuffer)),
            withRetry(() => transcribeAudio(agentBuffer)),
        ]);

        // Step 3: merge
        log("merge", "Merging transcripts...");
        const mergedTranscript = await mergeTranscriptions(agentTranscription, userTranscription);

        // Step 4: phrase-level processing
        log("phrases", "Decoding & cutting user audio...");
        const audioData = decodeWavToRawAudioBuffer(userBuffer);

        const phraseChunks = await Promise.all(
            userTranscription.map(async (phrase) => {
                const { offsetMilliseconds: start, durationMilliseconds: duration } = phrase;
                const cutAudio = cutRawAudioBuffer(audioData, start, duration);
                const wavBuffer = encodeRawAudioBufferToWav(cutAudio);
                log("phrase", `"${phrase.text}" cut from ${start}–${start + duration}ms`);
                return { ...phrase, wavBuffer };
            })
        );

        // Step 5: pronunciation assessment
        log("assessment", "Running assessments in parallel...");
        const finalPhrases = await Promise.all(
            phraseChunks.map(async ({ wavBuffer, ...phrase }) => {
                const assessment = await withRetry(() => assessPronunciation(phrase.text, wavBuffer));
                return { ...phrase, assessment };
            })
        );

        // Step 6: AI suggestions
        log("suggestions", "Generating AI recommendations...");
        const recommendations = await generateSuggestion(mergedTranscript);

        // Step 7: persist
        log("db", "Saving results...");
        await db.sessions.update({
            where: { id: sessionId },
            data: {
                assessedDetail: JSON.stringify(finalPhrases),
                transcript: JSON.stringify(mergedTranscript),
                assessmentStatus: "ASSESSED",
                aiSuggestions: JSON.stringify(recommendations),
            },
        });

        log("done", "Session processed successfully ✅");
        return { mergedTranscript, finalPhrases, recommendations };
    } catch (err) {
        console.error(`[transcribeAudioMerged][${sessionId}] ❌`, err);
        throw err;
    }
};


export const monologueAssessment = async (
    sessionId: string
) => {
    const log = (step: string, msg: string) =>
        console.log(`[monologueAssessment][${sessionId}][${step}] ${msg}`);

    try {
        // Step 1: fetch user recording
        const readable = await getRecordings(sessionId, "user");
        if (!readable) throw new Error("Failed to retrieve user recording.");
        log("fetch", "User recording retrieved.");

        const userBuffer = await readableToBuffer(readable);
        readable.destroy();

        // Step 2: transcribe
        log("transcribe", "Transcribing user audio...");
        const userTranscript = await transcribeAudio(userBuffer);

        // get text only for logging
        const textOnly = userTranscript.map(t => t.text).join(" ");

        // Step 3: phrase-level processing
        log("phrases", "Decoding & cutting user audio...");
        const audioData = decodeWavToRawAudioBuffer(userBuffer);

        const phraseChunks = await Promise.all(
            userTranscript.map(async (phrase) => {
                const { offsetMilliseconds: start, durationMilliseconds: duration } = phrase;
                const cutAudio = cutRawAudioBuffer(audioData, start, duration);
                const wavBuffer = encodeRawAudioBufferToWav(cutAudio);
                log("phrase", `"${phrase.text}" cut from ${start}–${start + duration}ms`);
                return { ...phrase, wavBuffer };
            })
        );

        // Step 4: pronunciation assessment
        log("assessment", "Assessing pronunciation for all phrases...");
        const finalPhrases = await Promise.all(
            phraseChunks.map(async ({ wavBuffer, ...phrase }) => {
                const assessment = await assessPronunciation(phrase.text, wavBuffer);
                return { ...phrase, assessment };
            })
        );

        // Step 5: AI suggestions
        log("suggestions", "Generating AI recommendations...");
        const recommendations = await monologueSuggestion(textOnly, sessionId);

        // Step 6: persist
        log("db", "Saving results...");
        await db.sessions.update({
            where: { id: sessionId },
            data: {
                assessedDetail: JSON.stringify(finalPhrases),
                transcript: textOnly,
                assessmentStatus: "ASSESSED",
                aiSuggestions: JSON.stringify(recommendations),
            },
        });

        log("done", "User audio processed successfully ✅");
        return { userTranscript, finalPhrases, recommendations };
    } catch (err) {
        console.error(`[transcribeUserAudio][${sessionId}] ❌`, err);
        throw err;
    }
};