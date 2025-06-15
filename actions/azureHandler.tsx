"use server";

import FormData from 'form-data';
import axios from 'axios';

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
        diarization: { maxSpeakers: 2, enabled: true }
    }));

    axios.post(BASE_URL, form, {
        headers: {
            'Ocp-Apim-Subscription-Key': "4PZfHAIHsw5qL2GuLidJcw0FStySukIU9nxWGEYZJEl3z3s6r869JQQJ99BFACqBBLyXJ3w3AAAEACOGQ4uM",
            'Content-Type': `multipart/form-data; boundary=${form.getBoundary()}`,
        }
    }).then((result) => {
        console.log("Transcription started successfully:", result.data);
    }).catch((err) => {
        console.error(err.response)
    })
}