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
    
}