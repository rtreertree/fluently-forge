// hooks/use-webrtc.ts

"use client";
import { useState, useRef, useEffect } from "react";
import { Tool } from "@/lib/tools";
import { createSession, endSession, getSession, offerSession } from "@/actions/session";
import { useSession } from "next-auth/react";
import { mergeAudioBlobsInParallel } from "@/lib/audio";
import { sessions } from "@prisma/client";

type Message = any;
const LOW_AUDIO_BITRATE = 16000;

const useWebRTCAudioSession = (
    voice: string,
    timelimit: number = 8,
    activeSession: sessions,
    tools?: Tool[],
) => {

    // Hooks/Refs for state & components
    const session = useSession();
    const [status, setStatus] = useState<string>("");
    const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
    const audioIndicatorRef = useRef<HTMLDivElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);

    const [msgs, setMsgs] = useState<Message[]>([]);
    const [micOn, setMicOn] = useState<boolean>(false);
    const [isPending, setIsPending] = useState<boolean>(false);
    const [sessionID, setSessionID] = useState<string | null>(null);

    const functionRegistry = useRef<Record<string, Function>>({});

    const [currentVolume, setCurrentVolume] = useState<number>(0);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const volumeIntervalRef = useRef<number | null>(null);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const recordedBlobsRef = useRef<Blob[]>([]);
    const [isRecording, setIsRecording] = useState<boolean>(false);

    const remoteRecorderRef = useRef<MediaRecorder | null>(null);
    const remoteRecordedBlobsRef = useRef<Blob[]>([]);

    // --- Data Channel Helpers --- //

    /** Sends a system message and trigger to the remote end. */
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
                        text: message,
                    },
                ],
            }
        };
        const triggerMsg = { type: "response.create" };

        try {
            dataChannelRef.current.send(JSON.stringify(systemMsg));
            setMsgs(prev => [...prev, systemMsg]);
            dataChannelRef.current.send(JSON.stringify(triggerMsg));
        } catch (err) {
            console.error("Failed to send system message:", err);
        }
    };

    /** Register a callable function by name for remote invocations. */
    const registerFunction = (name: string, fn: Function) => {
        functionRegistry.current[name] = fn;
    };

    /** Sends session metadata to the peer upon data channel opening. */
    const configureDataChannel = (dataChannel: RTCDataChannel) => {
        const sessionUpdate = {
            type: 'session.update',
            session: {
                modalities: ['text', 'audio'],
                tools: tools || [],
            }
        };
        dataChannel.send(JSON.stringify(sessionUpdate));
    };

    /** Handles incoming data channel messages. */
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
                            output: JSON.stringify(result),
                        }
                    };
                    dataChannelRef.current?.send(JSON.stringify(response));
                }
            }

            setMsgs(prevMsgs => [...prevMsgs, msg]);
        } catch (error) {
            console.error('Error handling data channel message:', error);
        }
    };

    // ----- React: Cleanup on unmount -----
    useEffect(() => {
        return () => {
            stopSession().catch((err) => {
                console.error('Error during cleanup:', err);
            });
        };
        // eslint-disable-next-line
    }, []); // Run once on mount/unmount

    // ----- Audio Visualisation -----

    /** Sets up simple audio level visualisation & analysis on the stream. */
    const setupAudioVisualization = (stream: MediaStream) => {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateIndicator = () => {
            analyser.getByteFrequencyData(dataArray);
            // Simple activity threshold
            const average = dataArray.reduce((a, b) => a + b) / bufferLength;
            if (audioIndicatorRef.current) {
                audioIndicatorRef.current.classList.toggle("active", average > 30);
            }
            requestAnimationFrame(updateIndicator);
        };
        updateIndicator();

        audioContextRef.current = audioContext;
    };

    /** Returns the current root mean square of the input for level monitoring. */
    const getVolume = (): number => {
        if (!analyserRef.current) return 0;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const float = (dataArray[i] - 128) / 128;
            sum += float * float;
        }
        return Math.sqrt(sum / dataArray.length);
    };

    // ----------- WebRTC Session ---------- //

    /** Main function to initiate the session and connect audio to remote peer. */
    const startSession = async () => {
        try {
            setIsPending(true);

            if (!activeSession) {
                setStatus("Session not found");
                return;
            }
            const session = await getSession(activeSession.id);

            if (!session) {
                setStatus("Session not found");
                return;
            }
            if (session.status === "COMPLETED" || session.endedAt || session.token === "NULL") {
                setIsPending(true);
                setStatus("Session has ended");
                return;
            }
            const ephemeralToken = session.token;
            setSessionID(session.id);

            setStatus("Requesting microphone access...");
            console.log("Requesting microphone access...");

            navigator.mediaDevices.enumerateDevices().then(devices => {
                const audioInputs = devices.filter(device => device.kind === 'audioinput');
                console.log("Available audio inputs:", audioInputs);
            });
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamRef.current = stream;
            setupAudioVisualization(stream);

            setStatus("Establishing connection...");
            const pc = new RTCPeerConnection();
            const audioEl = document.createElement("audio");
            audioEl.autoplay = true;

            console.log("Setting up peer connection...");


            // ----- Setup remote track handler -----
            pc.ontrack = (e) => {
                audioEl.srcObject = e.streams[0];

                // Analysis for incoming (remote) audio
                const audioContext = new (window.AudioContext || window.AudioContext)();
                const source = audioContext.createMediaStreamSource(e.streams[0]);
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);
                analyserRef.current = analyser;

                // Start volume monitoring for remote
                volumeIntervalRef.current = window.setInterval(() => {
                    const volume = getVolume();
                    setCurrentVolume(volume);
                    // Optionally: log when speech detected
                }, 100);

                // Set up remote audio recording
                try {
                    if (remoteRecorderRef.current) {
                        remoteRecorderRef.current.stop();
                        remoteRecorderRef.current = null;
                        remoteRecordedBlobsRef.current = [];
                    }
                    const remoteRecorder = new MediaRecorder(e.streams[0], {
                        mimeType: "audio/webm",
                        audioBitsPerSecond: LOW_AUDIO_BITRATE,
                    });
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

            // ---- Data Channel -----
            const dataChannel = pc.createDataChannel('response');
            dataChannelRef.current = dataChannel;

            dataChannel.onopen = () => configureDataChannel(dataChannel);
            dataChannel.onmessage = handleDataChannelMessage;

            // ---- Add local stream -----
            const [audioTrack] = stream.getTracks();
            if (audioTrack) {
                pc.addTrack(audioTrack, stream);
            }

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const sdpResponse = await offerSession(offer.sdp as string, ephemeralToken as string);
            await pc.setRemoteDescription({
                type: "answer",
                sdp: sdpResponse,
            });

            // ---- Start recording local audio -----
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: "audio/webm",
                audioBitsPerSecond: LOW_AUDIO_BITRATE,
            });
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
            setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
            stopSession();
        }
    };

    /** Uploads final audio recordings for user and agent to the server. */
    const sendRecordingToServer = async () => {
        if (recordedBlobsRef.current.length === 0 && remoteRecordedBlobsRef.current.length === 0) return;

        // Merge and convert blobs to WAV for both user and agent
        const userBlob = new Blob(recordedBlobsRef.current, { type: 'audio/webm' });
        const agentBlob = new Blob(remoteRecordedBlobsRef.current, { type: "audio/webm" });

        // Merge and encode (async)
        setStatus("Processing audio...");
        try {
            const userBlobWav = await mergeAudioBlobsInParallel([userBlob]);
            const agentBlobWav = await mergeAudioBlobsInParallel([agentBlob]);
            const merged = await mergeAudioBlobsInParallel([userBlob, agentBlob]);
            if (!merged || !agentBlobWav || !userBlobWav) {
                setStatus("Failed to convert audio blobs");
                return;
            }

            const formData = new FormData();
            formData.append("user-audio", userBlobWav);
            formData.append("agent-audio", agentBlobWav);
            formData.append("mixed-audio", merged);
            formData.append("user-id", session.data?.user.id || "");
            formData.append("session-id", sessionID as string || "");

            setStatus("Uploading audio...");
            const response = await fetch("/api/session/upload-audio", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session.data?.user.id}`,
                },
                body: formData,
            });
            if (!response.ok) {
                setStatus("Failed to upload audio");
                console.error("Failed to upload audio:", response.statusText);
                return;
            }
            setStatus("Audio uploaded successfully!");
            console.log("Audio uploaded successfully!");

        } catch (err) {
            setStatus("Error processing audio");
            console.error("Error uploading audio:", err);
        }
    };

    /** Helper: cleanly stops a MediaRecorder and waits for the stop event. */
    function stopRecorderAndWait(recorder: MediaRecorder | null): Promise<void> {
        return new Promise((resolve) => {
            if (!recorder) return resolve();
            if (recorder.state === "inactive") return resolve();
            recorder.onstop = () => resolve();
            recorder.stop();
        });
    }

    /** Tears down all session state, closes media/devices/peer connection. */
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
        analyserRef.current = null;

        // Stop recorders & flush recording
        await Promise.all([
            stopRecorderAndWait(recorderRef.current),
            stopRecorderAndWait(remoteRecorderRef.current),
        ]);
        await sendRecordingToServer();

        // End session on server
        if (sessionID)
            endSession(sessionID).catch((err) => { console.error("Error ending session:", err); });

        // Reset local state
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

    /** Sets the microphone stream on/off. */
    const setMicOnOff = (isOn: boolean) => {
        if (audioStreamRef.current) {
            const audioTracks = audioStreamRef.current.getAudioTracks();
            if (audioTracks.length > 0) {
                setMicOn(isOn);
                audioTracks[0].enabled = isOn;
            }
        }
    };

    /** Handles mic button: toggles mic if active, or starts session if not. */
    const handleStartStopClick = async () => {
        if (isSessionActive) {
            setMicOnOff(!micOn);
        } else {
            await startSession();
        }
    };

    // ---- Exported Object ---- //
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