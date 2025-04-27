//hooks/use-webrtc.ts
"use client";

import { useState, useRef, useEffect, use } from "react";
import { Tool } from "@/lib/tools";
import { createSession, offerSession } from "@/actions/session";
import { useSession } from "next-auth/react";
import { mergeAudioBlobsInParallel } from "@/lib/audio";

const useWebRTCAudioSession = (voice: string, timelimit: Number = 8, tools?: Tool[]) => {
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


    const sendSystemMessage = (message: string) => {
        if (!dataChannelRef.current || dataChannelRef.current.readyState !== "open") {
            console.warn("Data channel not open. Cannot send system message.");
            return;
        }

        const systemMsg = {
            type: "conversation.item.create",
            item: {
                role: "user",
                type: "message",
                content: [
                    {
                        type: "input_text",
                        text: "1 minute left, Try to wrap up the conversation. and end the conversation smoothly.",
                    },
                ],
            }
        };

        const triggerMsg = {
            type: "response.create",
        };

        try {
            dataChannelRef.current.send(JSON.stringify(systemMsg));
            setMsgs(prev => [...prev, systemMsg]);
            dataChannelRef.current.send(JSON.stringify(triggerMsg));
        } catch (err) {
            console.error("Failed to send system message:", err);
        }
    }

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
            if (msg.type === 'error') {
                console.error('Error from server:', msg);
                return;
            }

            if (msg.type === 'conversation.item.created') {
                console.log('Received message:', msg.item);
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

            setIsPending(false);
            setMicOn(true);

        } catch (err) {
            console.error(err);
            setStatus(`Error: ${err}`);
            stopSession();
        }
    };


    const sendRecordingToServer = async () => {
        if (recordedBlobsRef.current.length === 0 && remoteRecordedBlobsRef.current.length === 0) return;

        const userBlob = new Blob(recordedBlobsRef.current, { type: 'audio/wav' });
        const agentBlob = new Blob(remoteRecordedBlobsRef.current, { type: "audio/wev" });

        console.log("User blob size:", userBlob.size);
        console.log("Agent blob size:", agentBlob.size);

        const startTime = Date.now();
        const merged = await mergeAudioBlobsInParallel([userBlob, agentBlob]);

        if (!merged) {
            console.error("Failed to merge audio blobs");
            return;
        }

        const endTime = Date.now();

        console.log("Merging time:", endTime - startTime, "ms");
        console.log("Merged blob size:", merged.size);


        setStatus("Processing audio...");

        const formData = new FormData();
        formData.append("mixed-audio", merged, 'mixed-audio.webm');
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
            console.log("Audio uploaded successfully:", data);
            setStatus("Audio recording uploaded successfully.");
        }
    };

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

        // Stop both recorders and wait for their onstop events
        const localStop = stopRecorderAndWait(recorderRef.current);
        const remoteStop = stopRecorderAndWait(remoteRecorderRef.current);

        await Promise.all([localStop, remoteStop]); // Wait for both recorders to fully stop
        await sendRecordingToServer();

        recordedBlobsRef.current = [];
        remoteRecordedBlobsRef.current = [];
        recorderRef.current = null;
        remoteRecorderRef.current = null;

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
        sendSystemMessage,
        msgs,
        currentVolume
    };
};

export default useWebRTCAudioSession;