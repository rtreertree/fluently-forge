//hooks/use-webrtc.ts
"use client";

import { useState, useRef, useEffect, use } from "react";
import { Tool } from "@/lib/tools";
import { createSession, offerSession, saveAudio } from "@/actions/session";
import { useSession } from "next-auth/react";

const useWebRTCAudioSession = (voice: string, tools?: Tool[]) => {
    const session = useSession();

    const [status, setStatus] = useState("");
    const [isSessionActive, setIsSessionActive] = useState(false);
    const audioIndicatorRef = useRef<HTMLDivElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const [msgs, setMsgs] = useState<any[]>([]);
    const [micOn, setMicOn] = useState(false);
    const [isPending, setIsPending] = useState(false);

    // Add function registry
    const functionRegistry = useRef<Record<string, Function>>({});
    const [currentVolume, setCurrentVolume] = useState(0);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const volumeIntervalRef = useRef<number | null>(null);

    // Add audio recorder
    const recorderRef = useRef<MediaRecorder | null>(null);
    const recordedBlobsRef = useRef<Blob[]>([]);
    const [isRecording, setIsRecording] = useState(false);

    const remoteRecorderRef = useRef<MediaRecorder | null>(null);
    const remoteRecordedBlobsRef = useRef<Blob[]>([]);

    // Add method to register tool functions
    const registerFunction = (name: string, fn: Function) => {
        functionRegistry.current[name] = fn;
    };

    // Add data channel configuration
    const configureDataChannel = (dataChannel: RTCDataChannel) => {
        const sessionUpdate = {
            type: 'session.update',
            session: {
                modalities: ['text', 'audio'],
                tools: tools || []
            }
        };

        dataChannel.send(JSON.stringify(sessionUpdate));
    };

    // Add data channel message handler
    const handleDataChannelMessage = async (event: MessageEvent) => {
        try {
            const msg = JSON.parse(event.data);

            if (msg.usage) {
                // const { total_tokens, prompt_tokens, completion_tokens } = msg.usage;
                // console.log(`Total tokens: ${total_tokens}, Prompt tokens: ${prompt_tokens}, Completion tokens: ${completion_tokens}`);
                console.log(msg.usage);
            }
            if (msg.type === 'response.function_call_arguments.done') {
                const fn = functionRegistry.current[msg.name];
                if (fn) {
                    const args = JSON.parse(msg.arguments);
                    const result = await fn(args);

                    const response = {
                        type: 'conversation.item.create',
                        item: {
                            type: 'function_call_output',
                            call_id: msg.call_id,
                            output: JSON.stringify(result)
                        }
                    };

                    dataChannelRef.current?.send(JSON.stringify(response));
                }
            }
            setMsgs(prevMsgs => [...prevMsgs, msg]);
            return msg;
        } catch (error) {
            console.error('Error handling data channel message:', error);
        }
    };

    useEffect(() => {
        return () => {
            stopSession().catch((err) => {
                console.error('Error during cleanup:', err);
            });
        };
    }, []);

    const setupAudioVisualization = (stream: MediaStream) => {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;

        source.connect(analyzer);

        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateIndicator = () => {
            if (!audioContext) return;

            analyzer.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / bufferLength;

            if (audioIndicatorRef.current) {
                audioIndicatorRef.current.classList.toggle("active", average > 30);
            }

            requestAnimationFrame(updateIndicator);
        };

        updateIndicator();
        audioContextRef.current = audioContext;
    };

    const getVolume = (): number => {
        if (!analyserRef.current) return 0;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(dataArray);

        // Calculate RMS (Root Mean Square)
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const float = (dataArray[i] - 128) / 128;
            sum += float * float;
        }

        return Math.sqrt(sum / dataArray.length);
    };

    const startSession = async () => {
        try {
            setIsPending(true);
            setStatus("Requesting microphone access...");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamRef.current = stream;
            setupAudioVisualization(stream);
            setMicOn(true);

            setStatus("Fetching ephemeral token...");
            const session = await createSession("alloy");
            const ephemeralToken = session.client_secret.value;

            setStatus("Establishing connection...");

            const pc = new RTCPeerConnection();
            const audioEl = document.createElement("audio");
            audioEl.autoplay = true;

            pc.ontrack = (e) => {
                audioEl.srcObject = e.streams[0];

                // Set up audio analysis
                const audioContext = new (window.AudioContext || window.AudioContext)();
                const source = audioContext.createMediaStreamSource(e.streams[0]);
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;

                source.connect(analyser);
                analyserRef.current = analyser;

                // Start volume monitoring
                volumeIntervalRef.current = window.setInterval(() => {
                    const volume = getVolume();
                    setCurrentVolume(volume);

                    // Optional: Log when speech is detected
                    if (volume > 0.1) {
                        console.log('Speech detected with volume:', volume);
                    }
                }, 100);

                if (remoteRecorderRef.current) {
                    remoteRecorderRef.current.stop();
                    remoteRecorderRef.current = null;
                    remoteRecordedBlobsRef.current = [];
                }

                try {
                    const remoteRecorder = new MediaRecorder(e.streams[0]);
                    remoteRecordedBlobsRef.current = [];
                    remoteRecorder.ondataavailable = (evt: BlobEvent) => {
                        if (evt.data && evt.data.size > 0) {
                            remoteRecordedBlobsRef.current.push(evt.data);
                        }
                    };
                    remoteRecorder.start();
                    remoteRecorderRef.current = remoteRecorder;
                } catch (err) {
                    console.error("Failed to record remote (AI) audio:", err);
                }

                setIsPending(false);
            };

            // Add data channel
            const dataChannel = pc.createDataChannel('response');
            dataChannelRef.current = dataChannel;

            dataChannel.onopen = () => {
                configureDataChannel(dataChannel);
            };

            dataChannel.onmessage = handleDataChannelMessage;

            pc.addTrack(stream.getTracks()[0]);

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const sdpResponse = await offerSession(offer.sdp as string, ephemeralToken);


            await pc.setRemoteDescription({
                type: "answer",
                sdp: sdpResponse,
            });

            const mediaRecorder = new MediaRecorder(stream);
            recordedBlobsRef.current = [];
            mediaRecorder.ondataavailable = (event: BlobEvent) => {
                if (event.data && event.data.size > 0) {
                    recordedBlobsRef.current.push(event.data);
                }
            };
            mediaRecorder.start();
            recorderRef.current = mediaRecorder;
            setIsRecording(true);

            peerConnectionRef.current = pc;
            setIsSessionActive(true);
            setStatus("Session established successfully!");

        } catch (err) {
            console.error(err);
            setStatus(`Error: ${err}`);
            stopSession();
        }
    };


    const sendRecordingToServer = async () => {
        if (recordedBlobsRef.current.length === 0 && remoteRecordedBlobsRef.current.length === 0) return;

        const userBlob = new Blob(recordedBlobsRef.current, { type: 'audio/webm' });
        const agentBlob = new Blob(remoteRecordedBlobsRef.current, { type: "audio/webm" });

        setStatus("Processing audio...");


        try {
            const audioContext = new AudioContext();

            const [userBuffer, agentBuffer] = await Promise.all([
                blobToAudioBuffer(audioContext, userBlob),
                blobToAudioBuffer(audioContext, agentBlob)
            ]);

            const mixedBuffer = mixAudioBuffers(audioContext, userBuffer, agentBuffer);
            const mixedBlob = await audioBufferToBlob(audioContext, mixedBuffer);

            const formData = new FormData();
            formData.append("mixed-audio", mixedBlob, 'mixed-audio.webm');
            formData.append("user", `${session.data?.user.name || "NULL"}`);

            setStatus("Uploading mixed audio...");

            const res = await fetch("/api/session/upload-audio", {
                method: "POST",
                body: formData
            });

            if (!res.ok) throw new Error("Failed to upload audio");

            const data = await res.json();

            if (data.error) throw new Error(data.error);
            if (data.success) {
                console.log("Audio uploaded successfully:", data.filename);
                setStatus("Audio recording uploaded successfully.");
            }
        } catch (error) {
            console.error("Audio upload failed:", error);
            setStatus("Audio upload failed.");
        }
    };

    // Helper: convert Blob to AudioBuffer
    async function blobToAudioBuffer(context: AudioContext, blob: Blob): Promise<AudioBuffer> {
        if (blob.size === 0) throw new Error("Audio blob is empty.");

        const arrayBuffer = await blob.arrayBuffer();
        return await context.decodeAudioData(arrayBuffer);
    }

    // Helper: mix two AudioBuffers
    function mixAudioBuffers(context: AudioContext, buffer1: AudioBuffer, buffer2: AudioBuffer): AudioBuffer {
        const maxLength = Math.max(buffer1.length, buffer2.length);
        const numChannels = Math.max(buffer1.numberOfChannels, buffer2.numberOfChannels);
        const output = context.createBuffer(numChannels, maxLength, context.sampleRate);

        for (let channel = 0; channel < numChannels; channel++) {
            const outputData = output.getChannelData(channel);
            const data1 = buffer1.getChannelData(channel % buffer1.numberOfChannels);
            const data2 = buffer2.getChannelData(channel % buffer2.numberOfChannels);

            for (let i = 0; i < maxLength; i++) {
                outputData[i] = (data1[i] || 0) + (data2[i] || 0);
            }
        }
        return output;
    }

    // Helper: convert AudioBuffer to Blob
    async function audioBufferToBlob(context: AudioContext, buffer: AudioBuffer): Promise<Blob> {
        const dest = context.createMediaStreamDestination();
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(dest);
        source.start();

        const mediaRecorder = new MediaRecorder(dest.stream);
        const chunks: BlobPart[] = [];

        return new Promise((resolve) => {
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/webm' }));
            mediaRecorder.start();
            source.onended = () => mediaRecorder.stop();
        });
    }

    // Add this helper function somewhere in the file (above or below stopSession):
    function stopRecorderAndWait(recorder: MediaRecorder | null): Promise<void> {
        console.log("Stopping recorder...");
        return new Promise((resolve) => {
            if (!recorder) return resolve();
            // If already stopped, resolve immediately
            if (recorder.state === "inactive") return resolve();
            recorder.onstop = () => resolve();
            recorder.stop();
        });
    }

    const stopSession = async () => {
        if (!isSessionActive) return;
        setStatus("Stopping session...");
        setMicOn(false);
        setIsPending(true);

        // Stop both recorders and wait for their onstop events
        const localStop = stopRecorderAndWait(recorderRef.current);
        const remoteStop = stopRecorderAndWait(remoteRecorderRef.current);

        await Promise.all([localStop, remoteStop]); // Wait for both recorders to fully stop

        await sendRecordingToServer();

        recordedBlobsRef.current = [];
        remoteRecordedBlobsRef.current = [];
        recorderRef.current = null;
        remoteRecorderRef.current = null;

        if (dataChannelRef.current) {
            dataChannelRef.current.close();
            dataChannelRef.current = null;
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach((track) => track.stop());
            audioStreamRef.current = null;
        }
        if (audioIndicatorRef.current) {
            audioIndicatorRef.current.classList.remove("active");
        }
        if (volumeIntervalRef.current) {
            clearInterval(volumeIntervalRef.current);
            volumeIntervalRef.current = null;
        }
        if (analyserRef.current) {
            analyserRef.current = null;
        }
        setCurrentVolume(0);
        setIsSessionActive(false);
        setStatus("");
        setMsgs([]);
        setMicOn(false);
        setIsPending(false);

    };


    // set mic on/off
    const setMicOnOff = (isOn: boolean) => {
        if (audioStreamRef.current) {
            const audioTracks = audioStreamRef.current.getAudioTracks();
            if (audioTracks.length > 0) {
                audioTracks[0].enabled = isOn;
            }
        }
    };  


    const handleStartStopClick = async () => {
        if (isSessionActive) {
            setMicOnOff(!micOn);
        } else {
            await startSession();
        }
    };

    return {
        status,
        isSessionActive,
        micOn,
        audioIndicatorRef,
        isPending,
        startSession,
        stopSession,
        handleStartStopClick,
        registerFunction,
        setMicOnOff,
        msgs,
        currentVolume
    };
};

export default useWebRTCAudioSession;