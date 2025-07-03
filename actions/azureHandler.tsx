"use server";

import FormData, { Readable } from 'form-data';
import { getRecordings } from './fileHandler';
import { audioBufferToWavBlob, bufferToAudioBuffer, readableToBuffer, cutRawAudioBuffer, decodeWavToRawAudioBuffer, encodeRawAudioBufferToWav } from '@/lib/audio';
import { assessPronunciation, PronunciationAssessmentWord } from './assessment';
import fs from 'fs';
import audioBufferToWav from 'audiobuffer-to-wav';
import wav from 'node-wav';

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
    const readable = await getRecordings(sessionId, "agent");

    if (!readable) {
        throw new Error("Failed to retrieve agent recording.");
    }

    console.log("Transcribing audio for session ID:", sessionId);
    console.log("Agent recording retrieved successfully. now converting to buffer...");
    const audioBuffer = await readableToBuffer(readable);
    const transcription = await transcribeAudio(audioBuffer);

    console.log("Trimming audio buffer to remove silence...");
    const audioData = decodeWavToRawAudioBuffer(audioBuffer);
    console.log("Audio data:", audioData);

    const trimmedAudio = cutRawAudioBuffer(audioData, transcription[0].offsetMilliseconds, transcription[0].durationMilliseconds);
    console.log("Trimmed audio data:", trimmedAudio);

    const trimedBuffer = encodeRawAudioBufferToWav(trimmedAudio);
    fs.writeFileSync("tmp/trimmed.wav", trimedBuffer);

    console.log("Transcription result:", transcription);
}

// export const transcribeAudioMerged = async (sessionId: string) => {

//     console.log("Transcribing audio for session ID:", sessionId);
//     const userRecordings = await getRecordings(sessionId, "user");
//     const agentRecordings = await getRecordings(sessionId, "agent");

//     if (!userRecordings || !agentRecordings) {
//         throw new Error("Failed to retrieve recordings for user or agent.");
//     }

    
//     console.log("User and agent recordings retrieved successfully. now converting to buffers...");

//     const userBuffer = await readableToBuffer(userRecordings);
//     const agentBuffer = await readableToBuffer(agentRecordings);

//     console.log(userBuffer.subarray(0, 16));
//     console.log("User audio buffer size:", userBuffer.length);
//     console.log("Agent audio buffer size:", agentBuffer.length);

//     console.log("ASCII: ", userBuffer.toString('ascii', 0, 16))

    // const audioContext = new AudioContext();
    // const audioBuffer = await bufferToAudioBuffer(agentBuffer);
    // const wavBuffer = audioBufferToWav(audioBuffer);

    // fs.writeFile("tmp/agent.wav", Buffer.from(wavBuffer), (err) => {
    //     if (err) {
    //         console.error("Error writing user audio buffer to file:", err);
    //     } else {
    //         console.log("User audio buffer written to tmp/user.wav");
    //     }
    // });

    // // Transcribe both user and agent audio
    // const [userTranscription, agentTranscription] = await Promise.all([
    //     transcribeAudio(userBuffer),
    //     transcribeAudio(agentBuffer)
    // ]);

    // const audioContext = new AudioContext();
    // const userAudioBuffer = await bufferToAudioBuffer(userBuffer, audioContext);

    // const wordResults = await assessAllSegments(userAudioBuffer, userTranscription);
    // console.log("User word results:", wordResults);


    // const mergedTranscription = await mergeTranscriptions(agentTranscription, userTranscription);
    // return mergedTranscription;
// }