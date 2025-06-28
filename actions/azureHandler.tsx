"use server";

import FormData from 'form-data';
import axios from 'axios';
import { getRecordings } from './fileHandler';
import { readableToBuffer } from '@/lib/audio';

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
    }
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
    const SUBSCRIPTION_KEY = process.env.AZURE_SUBSCRIPTION_ID;
    const REGION = process.env.AZURE_REGION;

    if (!SUBSCRIPTION_KEY || !REGION) {
        throw new Error("Azure subscription ID or region is not set in environment variables.");
    }

    return {
        SUBSCRIPTION_KEY,
        REGION
    };
}


export const transcribeAudio = async (audioBuffer: Buffer) => {
    const { SUBSCRIPTION_KEY, REGION } = getAzureConfig();
    const BASE_URL = `https://azureai-services-fluently.cognitiveservices.azure.com/speechtotext/transcriptions:transcribe?api-version=2024-11-15`;
    console.log("Transcribing audio with Azure Speech Service...");

    // Prepare the multipart form
    const form = new FormData();
    form.append('audio', audioBuffer, {
        filename: 'audio.wav', // or whatever type you expect
        contentType: 'audio/wav', // adjust if using mp3 or other type
    });

    form.append('definition', JSON.stringify({
        locales: ["en-US"],
    }));

    const result = await axios.post(BASE_URL, form, {
        headers: {
            'Ocp-Apim-Subscription-Key': "4PZfHAIHsw5qL2GuLidJcw0FStySukIU9nxWGEYZJEl3z3s6r869JQQJ99BFACqBBLyXJ3w3AAAEACOGQ4uM",
            'Content-Type': `multipart/form-data; boundary=${form.getBoundary()}`,
        }
    })

    if (result.status !== 200) {
        throw new Error(`Failed to start transcription: ${result.statusText}`);
    }

    return result.data.phrases as TranscriptionResponse[];
}

export const transcribeAudioMerged = async (sessionId: string) => {
    const userRecordings = await getRecordings(sessionId, "user");
    const agentRecordings = await getRecordings(sessionId, "agent");

    if (!userRecordings || !agentRecordings) {
        throw new Error("Failed to retrieve recordings for user or agent.");
    }

    const userBuffer = await readableToBuffer(userRecordings);
    const agentBuffer = await readableToBuffer(agentRecordings);

    // Transcribe both user and agent audio
    const [userTranscription, agentTranscription] = await Promise.all([
        transcribeAudio(userBuffer),
        transcribeAudio(agentBuffer)
    ]);

    

    const mergedTranscription = await mergeTranscriptions(agentTranscription, userTranscription);
    return mergedTranscription;
}