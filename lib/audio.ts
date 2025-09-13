import { Readable } from "stream";
import audioBufferToWav from "audiobuffer-to-wav";
import * as wav from "node-wav";

declare global {
    interface Window {
        webkitAudioContext: typeof AudioContext
    }
}

export interface RawAudioBuffer {
    sampleRate: number;
    numberOfChannels: number;
    length: number;
    channels: Float32Array[];
}
export async function mergeAudioBlobsInParallel(
    blobs: Blob[]
): Promise<Blob | null> {
    if (!blobs.length) return null;
    const context = new AudioContext();
    const audioBuffers = await Promise.all(
        blobs.map(async (blob) => {
            const arrayBuffer = await blob.arrayBuffer();
            return await context.decodeAudioData(arrayBuffer);
        })
    );
    const maxChannels = Math.max(...audioBuffers.map(b => b.numberOfChannels));
    const maxDuration = Math.max(...audioBuffers.map(b => b.duration));
    const length = Math.ceil(context.sampleRate * maxDuration);
    const outputBuffer = context.createBuffer(
        maxChannels,
        length,
        context.sampleRate
    );

    // Mix
    audioBuffers.forEach((buffer) => {
        for (let channel = 0; channel < maxChannels; channel++) {
            const inputData = buffer.numberOfChannels > channel
                ? buffer.getChannelData(channel)
                : null;
            const outputData = outputBuffer.getChannelData(channel);
            if (inputData) {
                for (let i = 0; i < inputData.length; i++) {
                    outputData[i] += inputData[i];
                }
            }
            // If inputData is null, channel is silent in this buffer.
        }
    });

    // Optional: Clip values to [-1,1] to prevent distortion
    for (let c = 0; c < maxChannels; c++) {
        const data = outputBuffer.getChannelData(c);
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.max(-1, Math.min(1, data[i]));
        }
    }

    context.close();

    return audioBufferToWavBlob(outputBuffer);
}

export async function bufferToAudioBuffer(buffer: ArrayBuffer): Promise<AudioBuffer> {
    const context = new AudioContext();
    const audioBuffer = await context.decodeAudioData(buffer.slice(0)); // Use a copy
    await context.close(); // Optional: close if you're not reusing
    return audioBuffer;
}

export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const numFrames = buffer.length;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const wavDataByteLength = numFrames * blockAlign;
    const headerByteLength = 44;
    const totalLength = headerByteLength + wavDataByteLength;
    const bufferArray = new ArrayBuffer(totalLength);
    const view = new DataView(bufferArray);
    let offset = 0;
    function writeString(s: string) {
        for (let i = 0; i < s.length; i++) view.setUint8(offset++, s.charCodeAt(i));
    }
    function writeUint32(value: number) {
        view.setUint32(offset, value, true); offset += 4;
    }
    function writeUint16(value: number) {
        view.setUint16(offset, value, true); offset += 2;
    }
    writeString("RIFF");
    writeUint32(totalLength - 8);
    writeString("WAVE");
    writeString("fmt ");
    writeUint32(16);
    writeUint16(1); // PCM
    writeUint16(numChannels);
    writeUint32(sampleRate);
    writeUint32(byteRate);
    writeUint16(blockAlign);
    writeUint16(bytesPerSample * 8);
    writeString("data");
    writeUint32(wavDataByteLength);
    // Interleave and write PCM samples
    for (let i = 0; i < numFrames; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            let sample = buffer.getChannelData(ch)[i];
            sample = Math.max(-1, Math.min(1, sample));
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
            view.setInt16(offset, sample, true);
            offset += 2;
        }
    }
    // Correct MIME type for WAV
    return new Blob([view], { type: "audio/wav" });
}

export function readableToBuffer(readable: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        readable.on('data', (chunk) => {
            // Always convert to Buffer if needed
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        readable.on('end', () => {
            resolve(Buffer.concat(chunks));
        });

        readable.on('error', reject);
    });
}


export function decodeWavToRawAudioBuffer(wavBuffer: Buffer): RawAudioBuffer {
    const result = wav.decode(wavBuffer);

    const { sampleRate, channelData } = result;
    const numberOfChannels = channelData.length;
    const length = channelData[0]?.length ?? 0;

    return {
        sampleRate,
        numberOfChannels,
        length,
        channels: Array.from(channelData),
    };
}

export function encodeRawAudioBufferToWav(raw: RawAudioBuffer): Buffer {
    const { sampleRate, channels } = raw;
    const encoded = wav.encode(channels, { sampleRate });
    return encoded;
}

export function cutRawAudioBuffer(
    source: RawAudioBuffer,
    offsetMilliseconds: number,
    durationMilliseconds: number
): RawAudioBuffer {
    const { sampleRate, numberOfChannels, channels } = source;
    const offsetSamples = Math.floor((offsetMilliseconds / 1000) * sampleRate);
    const durationSamples = Math.floor((durationMilliseconds / 1000) * sampleRate);
    const cutLength = Math.min(durationSamples, source.length - offsetSamples);

    const newChannels: Float32Array[] = [];
    for (let channel = 0; channel < numberOfChannels; channel++) {
        const sourceData = channels[channel];
        const slicedData = new Float32Array(cutLength);
        for (let i = 0; i < cutLength; i++) {
            slicedData[i] = sourceData[offsetSamples + i] ?? 0;
        }
        newChannels.push(slicedData);
    }

    return {
        sampleRate,
        numberOfChannels,
        length: cutLength,
        channels: newChannels,
    };
}