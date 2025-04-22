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
        return () => stopSession();
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

                // === Set up remote audio recorder ===
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
        if (recordedBlobsRef.current.length === 0) return;
        const audioBlob = new Blob(recordedBlobsRef.current, { type: 'audio/webm' });
        const date = `${Date.now()}`;

        // You might want to customize endpoint, field name, etc.
        const formData = new FormData();
        formData.append('audio', audioBlob, 'session-audio.webm');
        formData.append("isRemote", "false");
        formData.append("filename", `${session.data?.user.name || "NULL"}${date}[user]`);
        setStatus("Uploading audio recording...");

        try {
            const res = await fetch("/api/session/upload-audio", {
                method: "POST",
                body: formData
            });

            if (!res.ok) {
                throw new Error("Failed to upload audio");
            }
            const data = await res.json();

            if (remoteRecordedBlobsRef.current.length > 0) {
                const aiBlob = new Blob(remoteRecordedBlobsRef.current, { type: "audio/webm" });
                const formData = new FormData();
                formData.append("audio", aiBlob, "ai-voice.webm");
                formData.append("isRemote", "true");
                formData.append("filename", `${date}[agent]`);

                await fetch("/api/session/upload-audio", {
                    method: "POST",
                    body: formData
                });
            }


            setStatus("Audio recording uploaded.");
        } catch (error) {
            console.error("Audio upload failed:", error);
            setStatus("Audio upload failed.");
        }
    };

    const stopSession = () => {

        if (recorderRef.current && isRecording) {
            recorderRef.current.stop();
            setIsRecording(false);

            recorderRef.current.onstop = async () => {
                await sendRecordingToServer();
                recordedBlobsRef.current = [];
                recorderRef.current = null;
            };
        }

        if (remoteRecorderRef.current) {
            remoteRecorderRef.current.stop();
        }

        if (remoteRecorderRef.current) {
            remoteRecorderRef.current.onstop = async () => {
                await sendRecordingToServer();
                remoteRecordedBlobsRef.current = [];
                remoteRecorderRef.current = null;
            };
        } else {
            sendRecordingToServer(); // If never started
        }

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
    };

    const handleStartStopClick = async () => {
        if (isSessionActive) {
            if (audioStreamRef.current) {
                const audioTracks = audioStreamRef.current.getAudioTracks();
                if (audioTracks.length > 0) {
                    const enabled = audioTracks[0].enabled;
                    audioTracks[0].enabled = !enabled;
                    setMicOn(!enabled);
                }
            }
        } else {
            await startSession();
        }
    };

    return {
        status,
        isSessionActive,
        micOn,
        audioIndicatorRef,
        startSession,
        stopSession,
        handleStartStopClick,
        registerFunction,
        msgs,
        currentVolume
    };
};

export default useWebRTCAudioSession;