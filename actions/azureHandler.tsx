"use server";

import FormData, { Readable } from 'form-data';
import { getRecordings } from './fileHandler';
import { audioBufferToWavBlob, bufferToAudioBuffer, readableToBuffer, cutRawAudioBuffer, decodeWavToRawAudioBuffer, encodeRawAudioBufferToWav, RawAudioBuffer } from '@/lib/audio';
import { assessPronunciation, PronunciationAssessmentWord } from './assessment';
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
    speaker: number; // 1 or 2
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

export const transcribeAudioMerged = async (sessionId: string)=> {
    const readable = await getRecordings(sessionId, "user");

    if (!readable) {
        throw new Error("Failed to retrieve agent recording.");
    }

    console.log("Transcribing audio for session ID:", sessionId);
    console.log("Agent recording retrieved successfully. now converting to buffer...");
    const audioBuffer = await readableToBuffer(readable);
    const transcription = await transcribeAudio(audioBuffer);

    console.log("Trimming audio buffer to remove silence...");
    const audioData = decodeWavToRawAudioBuffer(audioBuffer);

    console.log("Processing transcription phrases...");

    // split data into chucks according to transcription with promise.all
    const transcriptionPromises =  transcription.map(async (phrase) => {
        const start = phrase.offsetMilliseconds;
        const duration = phrase.durationMilliseconds;

        // Cut the audio buffer for this phrase
        const cutAudio = cutRawAudioBuffer(audioData, start, duration);
        console.log(`Cut audio for phrase "${phrase.text}" from ${start}ms to ${start + duration}ms`);

        // Convert the cut audio back to WAV format
        const wavBuffer = encodeRawAudioBufferToWav(cutAudio);
        return {
            ...phrase,
            wavBuffer
        };
    });

    const phrases = await Promise.all(transcriptionPromises);

    console.log("create an assessment for each phrase in parallel...");
    // Process each phrase in parallel for pronunciation assessment
    const assessmentPromises = phrases.map(async (phrase) => {
        const assessment = await assessPronunciation(phrase.text, phrase.wavBuffer);
        return {
            ...phrase,
            assessment
        };
    });

    const assessedPhrases = await Promise.all(assessmentPromises);

    // remove waveBuffer from assessedPhrase
    const finalPhrases = assessedPhrases.map(({ wavBuffer, ...rest }) => rest);

    db.sessions.update({
        where: { id: sessionId },
        data: {
            assessedDetail: JSON.stringify(finalPhrases)
        }
    }).catch((err) => {
        console.error("Failed to update session with transcription:", err);
        throw new Error("Failed to update session with transcription.");
    });


    console.log("All phrases assessed successfully.");
    console.log("Returning merged transcription with assessments...");
}