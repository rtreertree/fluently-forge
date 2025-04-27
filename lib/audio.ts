


export async function mergeAudioBlobsInParallel(
    blobs: Blob[]
): Promise<Blob | null> {
    const context = new AudioContext();

    const audioBuffers = await Promise.all(
        blobs.map(async (blob) => {
            const arrayBuffer = await blob.arrayBuffer();
            return await context.decodeAudioData(arrayBuffer);
        })
    );

    const maxDuration = Math.max(...audioBuffers.map((buf) => buf.duration));
    const outputBuffer = context.createBuffer(
        2, // stereo
        context.sampleRate * maxDuration,
        context.sampleRate
    );

    audioBuffers.forEach((buffer) => {
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const inputData = buffer.getChannelData(channel);
            const outputData = outputBuffer.getChannelData(channel);

            for (let i = 0; i < inputData.length; i++) {
                outputData[i] += inputData[i]; // Simple mixing (additive)
            }
        }
    });

    return audioBufferToWavBlob(outputBuffer);
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
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
        for (let i = 0; i < s.length; i++) {
            view.setUint8(offset++, s.charCodeAt(i));
        }
    }

    function writeUint32(value: number) {
        view.setUint32(offset, value, true);
        offset += 4;
    }

    function writeUint16(value: number) {
        view.setUint16(offset, value, true);
        offset += 2;
    }

    writeString("RIFF");
    writeUint32(totalLength - 8);
    writeString("WAVE");
    writeString("fmt ");
    writeUint32(16); // PCM
    writeUint16(1); // format: 1 = PCM
    writeUint16(numChannels);
    writeUint32(sampleRate);
    writeUint32(byteRate);
    writeUint16(blockAlign);
    writeUint16(bytesPerSample * 8);
    writeString("data");
    writeUint32(wavDataByteLength);

    // Interleave and write PCM samples
    const interleaved = new Float32Array(numFrames * numChannels);
    for (let i = 0; i < numFrames; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            interleaved[i * numChannels + ch] = buffer.getChannelData(ch)[i];
        }
    }

    for (let i = 0; i < interleaved.length; i++) {
        let sample = Math.max(-1, Math.min(1, interleaved[i]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, sample, true);
        offset += 2;
    }

    return new Blob([view], { type: "audio/wav" });
}