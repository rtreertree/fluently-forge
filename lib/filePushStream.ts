// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import * as fs from "fs";

/**
 * Reads a signed 32-bit integer from a file descriptor.
 */
function ReadInt32(fd: number): number {
    const buffer = Buffer.alloc(4);
    const bytesRead = fs.readSync(fd, buffer, 0, 4, null);
    if (bytesRead !== 4) {
        throw new Error(`Error reading 32-bit integer from .wav file header. Expected 4 bytes. Actual bytes read: ${bytesRead}`);
    }
    return buffer.readInt32LE(0);
}

/**
 * Reads an unsigned 16-bit integer from a file descriptor.
 */
function ReadUInt16(fd: number): number {
    const buffer = Buffer.alloc(2);
    const bytesRead = fs.readSync(fd, buffer, 0, 2, null);
    if (bytesRead !== 2) {
        throw new Error(`Error reading 16-bit unsigned integer from .wav file header. Expected 2 bytes. Actual bytes read: ${bytesRead}`);
    }
    return buffer.readUInt16LE(0);
}

/**
 * Reads an unsigned 32-bit integer from a file descriptor.
 */
function ReadUInt32(fd: number): number {
    const buffer = Buffer.alloc(4);
    const bytesRead = fs.readSync(fd, buffer, 0, 4, null);
    if (bytesRead !== 4) {
        throw new Error(`Error reading unsigned 32-bit integer from .wav file header. Expected 4 bytes. Actual bytes read: ${bytesRead}`);
    }
    return buffer.readUInt32LE(0);
}

/**
 * Reads a string of a given length from a file descriptor.
 */
function ReadString(fd: number, length: number): string {
    const buffer = Buffer.alloc(length);
    const bytesRead = fs.readSync(fd, buffer, 0, length, null);
    if (bytesRead !== length) {
        throw new Error(`Error reading string from .wav file header. Expected ${length} bytes. Actual bytes read: ${bytesRead}`);
    }
    return buffer.toString("ascii").replace(/\0/g, "");
}

/**
 * Interface representing the header of a WAV file.
 */
interface WavFileHeader {
    framerate: number;
    bitsPerSample: number;
    nChannels: number;
    tag: number;
}

/**
 * Reads and returns relevant fields from a .wav file header.
 */
export const readWavFileHeader = (audioFileName: string): WavFileHeader => {
    const fd = fs.openSync(audioFileName, "r");
    try {
        if (ReadString(fd, 4) !== "RIFF") {
            throw new Error("Error reading .wav file header. Expected 'RIFF' tag.");
        }
        // File size (skip)
        ReadInt32(fd);

        if (ReadString(fd, 4) !== "WAVE") {
            throw new Error("Error reading .wav file header. Expected 'WAVE' tag.");
        }
        if (ReadString(fd, 4) !== "fmt ") {
            throw new Error("Error reading .wav file header. Expected 'fmt ' tag.");
        }
        // Format size
        const formatSize = ReadInt32(fd);
        if (formatSize < 16) {
            throw new Error(`Error reading .wav file header. Expected format size of at least 16 bytes. Actual size: ${formatSize}`);
        }
        // Format tag, channels, rate, alignment, bits/pixel
        const tag = ReadUInt16(fd);
        const nChannels = ReadUInt16(fd);
        const framerate = ReadUInt32(fd);
        // Average bytes per second (skip)
        ReadUInt32(fd);
        // Block align (skip)
        ReadUInt16(fd);
        const bitsPerSample = ReadUInt16(fd);

        // Skip the rest of format chunk if longer than 16
        if (formatSize > 16) {
            // Skip (formatSize - 16) bytes
            fs.readSync(fd, Buffer.alloc(formatSize - 16), 0, formatSize - 16, null);
        }

        // Look for "data" chunk, skipping any extra chunks (e.g., "LIST" etc)
        let chunkId = ReadString(fd, 4);
        let chunkSize = ReadUInt32(fd);
        // Skip non-"data" chunks
        while (chunkId !== "data") {
            // Skip this chunk
            fs.readSync(fd, Buffer.alloc(chunkSize), 0, chunkSize, null);
            // Read next chunk id and size
            chunkId = ReadString(fd, 4);
            chunkSize = ReadUInt32(fd);
        }

        return {
            framerate,
            bitsPerSample,
            nChannels,
            tag,
        };
    } finally {
        fs.closeSync(fd);
    }
};

/**
 * Opens and returns a PushAudioInputStream for the given wav file.
 */
export const openPushStream = (filename: string): sdk.PushAudioInputStream => {
    // Get the wave header for the file.
    const wavFileHeader = readWavFileHeader(filename);
    let formatTag: sdk.AudioFormatTag;
    switch (wavFileHeader.tag) {
        case 1: // PCM
            formatTag = sdk.AudioFormatTag.PCM;
            break;
        case 6:
            formatTag = sdk.AudioFormatTag.ALaw;
            break;
        case 7:
            formatTag = sdk.AudioFormatTag.MuLaw;
            break;
        default:
            throw new Error(`Wave format ${wavFileHeader.tag} is not supported`);
    }

    // Create the format for PCM Audio.
    const format = sdk.AudioStreamFormat.getWaveFormat(
        wavFileHeader.framerate,
        wavFileHeader.bitsPerSample,
        wavFileHeader.nChannels,
        formatTag
    );

    // Create the push stream for the speech sdk.
    const pushStream = sdk.AudioInputStream.createPushStream(format);

    // Find where the data chunk starts 
    // (header is at least 44 bytes, but as a workaround, the header parsing above leaves us at the correct spot if you wish to adapt for all WAV files;
    // typically people use 44 as start for PCM, but smarter is to seek the actual 'data' chunk.)
    let dataStart = 44; // fallback, but ideally parse actual offset

    // open the file and push it to the push stream
    fs.createReadStream(filename, { start: dataStart })
    .on("data", (chunk: Buffer | string) => {
        if (typeof chunk === "string") {
            // Should not occur for binary streams.
            throw new Error("Expected Buffer, received string. Did you specify encoding?");
        }
        const arrayBuffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer;
        pushStream.write(arrayBuffer);
    })
    .on("end", () => {
        pushStream.close();
    });
    return pushStream;
};