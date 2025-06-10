"use client";
import { useState, useRef, useEffect } from "react";
import { Tool } from "@/lib/tools";
import { createSession, endSession, getSession, offerSession } from "@/actions/session";
import { useSession } from "next-auth/react";
import { mergeAudioBlobsInParallel } from "@/lib/audio";
import { sessions } from "@prisma/client";

// ---- Constants/Types ----
const STATUS = {
    NOT_FOUND: "Session not found",
    ENDED: "Session has ended",
    REQUEST_MIC: "Requesting microphone access...",
    ESTABLISH: "Establishing connection...",
    ESTABLISHED: "Session established successfully!",
    PROCESSING: "Processing audio...",
    UPLOADING: "Uploading audio...",
    UPLOAD_ERROR: "Failed to upload audio",
    UPLOAD_SUCCESS: "Audio uploaded successfully!",
    UNSUPPORTED: "Recording not supported in this browser.",
    ERROR: (err: string) => `Error: ${err}`,
    BLOB_ERROR: "Failed to convert audio blobs",
    STOPPING: "Stopping session...",
} as const;

type Message =
    | { type: string;[key: string]: any };

type FunctionRegistry = Record<string, (...args: any[]) => Promise<any> | any>;

// ---- Hook ----
const useWebRTCAudioSession = (
    voice: string,
    timelimit: number = 8,
    activeSession: sessions,
    tools?: Tool[],
) => {
    const session = useSession();
    const [status, setStatus] = useState<string>("");
    const [isSessionActive, setIsSessionActive] = useState(false);
    const audioIndicatorRef = useRef<HTMLDivElement | null>(null);

    // Audio, peer refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);

    // State
    const [msgs, setMsgs] = useState<Message[]>([]);
    const [micOn, setMicOn] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [sessionID, setSessionID] = useState<string | null>(null);

    const functionRegistry = useRef<FunctionRegistry>({});
    const [currentVolume, setCurrentVolume] = useState(0);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const volumeIntervalRef = useRef<number | null>(null);

    // Audio recording
    const recorderRef = useRef<MediaRecorder | null>(null);
    const recordedBlobsRef = useRef<Blob[]>([]);
    const [isRecording, setIsRecording] = useState(false);

    const remoteRecorderRef = useRef<MediaRecorder | null>(null);
    const remoteRecordedBlobsRef = useRef<Blob[]>([]);

    // To prevent setting state after unmount
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            stopSession().catch(console.error);
        };
        // eslint-disable-next-line
    }, []);

    // ----- Internal helpers -----

    const sendSystemMessage = (message: string) => {
        const dc = dataChannelRef.current;
        if (!dc || dc.readyState !== "open") return;
        try {
            const systemMsg: Message = {
                type: "conversation.item.create",
                item: {
                    role: "user",
                    type: "message",
                    content: [{ type: "input_text", text: message }]
                }
            };
            const triggerMsg: Message = { type: "response.create" };
            dc.send(JSON.stringify(systemMsg));
            dc.send(JSON.stringify(triggerMsg));
            setMsgs(prev => [...prev, systemMsg]);
        } catch (err) {
            console.error("Failed to send system message:", err);
        }
    };

    const registerFunction = (name: string, fn: (...args: any[]) => any) => {
        functionRegistry.current[name] = fn;
    };

    const configureDataChannel = (dataChannel: RTCDataChannel) => {
        const sessionUpdate: Message = {
            type: 'session.update',
            session: { modalities: ['text', 'audio'], tools: tools || [] }
        };
        dataChannel.send(JSON.stringify(sessionUpdate));
    };

    const handleDataChannelMessage = async (event: MessageEvent) => {
        try {
            const msg: Message = JSON.parse(event.data);
            if (msg.type === 'error') {
                console.error('Error from server:', msg);
                return;
            }

            if (msg.type === 'response.function_call_arguments.done') {
                const fn = functionRegistry.current[msg.name];
                if (fn) {
                    const args = JSON.parse(msg.arguments);
                    const result = await fn(args);
                    const response: Message = {
                        type: "conversation.item.create",
                        item: {
                            type: "function_call_output",
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

    const setupAudioVisualization = (stream: MediaStream) => {
        const ctx = new window.AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        // Effect loop
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateIndicator = () => {
            if (!ctx) return;
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
            if (audioIndicatorRef.current) {
                audioIndicatorRef.current.classList.toggle("active", average > 30);
            }
            if (mountedRef.current) requestAnimationFrame(updateIndicator);
        };
        updateIndicator();
        audioContextRef.current = ctx;
    };

    // Calculate RMS volume
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

    // ----- Core methods -----

    const startSession = async () => {
        setIsPending(true);

        try {
            if (!activeSession) {
                setStatus(STATUS.NOT_FOUND);
                setIsPending(false);
                return;
            }
            const currSession = await getSession(activeSession.id);
            if (!currSession) {
                setStatus(STATUS.NOT_FOUND);
                setIsPending(false);
                return;
            }
            if (currSession.status === "COMPLETED" || currSession.endedAt || currSession.token === "NULL") {
                setStatus(STATUS.ENDED);
                setIsPending(false);
                return;
            }

            const ephemeralToken = currSession.token;
            setSessionID(currSession.id);
            setStatus(STATUS.REQUEST_MIC);

            // Feature-detect MediaRecorder
            if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined") {
                setStatus(STATUS.UNSUPPORTED);
                setIsPending(false);
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });

            audioStreamRef.current = stream;
            setupAudioVisualization(stream);
            setStatus(STATUS.ESTABLISH);

            const pc = new RTCPeerConnection();

            // Remote audio
            const audioEl = document.createElement("audio");
            audioEl.autoplay = true;
            pc.ontrack = (e) => {
                audioEl.srcObject = e.streams[0];
                // Set up audio analysis for remote stream
                const ctx = new window.AudioContext();
                const source = ctx.createMediaStreamSource(e.streams[0]);
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);
                analyserRef.current = analyser;
                volumeIntervalRef.current = window.setInterval(() => {
                    const volume = getVolume();
                    if (mountedRef.current) setCurrentVolume(volume);
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

            // Data channel
            const dataChannel = pc.createDataChannel('response');
            dataChannelRef.current = dataChannel;
            dataChannel.onopen = () => configureDataChannel(dataChannel);
            dataChannel.onmessage = handleDataChannelMessage;

            pc.addTrack(stream.getTracks()[0]);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            const sdpResponse = await offerSession(offer.sdp as string, ephemeralToken as string);
            await pc.setRemoteDescription({ type: "answer", sdp: sdpResponse });

            // Local recorder
            const mediaRecorder = new MediaRecorder(stream);
            recordedBlobsRef.current = [];
            mediaRecorder.ondataavailable = (event: BlobEvent) => {
                if (event.data && event.data.size > 0) {
                    recordedBlobsRef.current.push(event.data);
                }
            };
            mediaRecorder.start();
            recorderRef.current = mediaRecorder;

            if (mountedRef.current) {
                setIsRecording(true);
                peerConnectionRef.current = pc;
                setIsSessionActive(true);
                setStatus(STATUS.ESTABLISHED);
                setIsPending(false);
                setMicOn(true);
            }
        } catch (err: any) {
            console.error(err);
            if (mountedRef.current) {
                setStatus(STATUS.ERROR(err?.message || String(err)));
                setIsPending(false);
                stopSession();
            }
        }
    };

    async function sendRecordingToServer() {
        if (recordedBlobsRef.current.length === 0 && remoteRecordedBlobsRef.current.length === 0) {
            console.warn("No audio recorded to send.");
            setStatus(STATUS.BLOB_ERROR);
            return;
        }

        const userBlob = new Blob(recordedBlobsRef.current, { type: 'audio/webm' });
        const agentBlob = new Blob(remoteRecordedBlobsRef.current, { type: "audio/webm" });

        setStatus(STATUS.PROCESSING);

        let userBlobWav, agentBlobWav, merged;
        try {
            [userBlobWav, agentBlobWav, merged] = await Promise.all([
                mergeAudioBlobsInParallel([userBlob]),
                mergeAudioBlobsInParallel([agentBlob]),
                mergeAudioBlobsInParallel([userBlob, agentBlob]),
            ]);
        } catch (e) {
            setStatus(STATUS.BLOB_ERROR);
            return;
        }
        if (!userBlobWav || !agentBlobWav || !merged) {
            setStatus(STATUS.BLOB_ERROR);
            return;
        }

        // form data
        const formData = new FormData();
        formData.append("user-audio", userBlobWav);
        formData.append("agent-audio", agentBlobWav);
        formData.append("mixed-audio", merged);
        formData.append("user-id", session.data?.user.id || "");
        formData.append("session-id", sessionID as string || "");

        setStatus(STATUS.UPLOADING);

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const response = await fetch("/api/session/upload-audio", {
                method: "POST",
                headers: { Authorization: `Bearer ${session.data?.user.id}` },
                body: formData,
            });
            if (!response.ok) {
                setStatus(STATUS.UPLOAD_ERROR);
                console.error("Failed to upload audio:", response.statusText);
                return;
            }
            // Optionally process response...
            if (mountedRef.current) setStatus(STATUS.UPLOAD_SUCCESS);
        } catch (err) {
            console.error("Error uploading audio:", err);
            if (mountedRef.current) setStatus(STATUS.UPLOAD_ERROR);
            return;
        }
    }

    function stopRecorderAndWait(recorder: MediaRecorder | null): Promise<void> {
        return new Promise((resolve) => {
            if (!recorder) return resolve();
            if (recorder.state === "inactive") return resolve();
            recorder.onstop = () => resolve();
            recorder.stop();
        });
    }

    const stopSession = async () => {
        if (!isSessionActive) return;
        setStatus(STATUS.STOPPING);
        setMicOn(false);
        setIsPending(true);

        try {
            dataChannelRef.current?.close();
            dataChannelRef.current = null;
            peerConnectionRef.current?.close();
            peerConnectionRef.current = null;
            audioContextRef.current?.close();
            audioContextRef.current = null;

            audioStreamRef.current?.getTracks().forEach(t => t.stop());
            audioStreamRef.current = null;

            if (audioIndicatorRef.current) audioIndicatorRef.current.classList.remove("active");
            if (volumeIntervalRef.current) {
                clearInterval(volumeIntervalRef.current);
                volumeIntervalRef.current = null;
            }
            analyserRef.current = null;

            // Wait for recorders
            await Promise.all([
                stopRecorderAndWait(recorderRef.current),
                stopRecorderAndWait(remoteRecorderRef.current)
            ]);

            await sendRecordingToServer();
            if (sessionID) await endSession(sessionID);

            // Clear refs
            recordedBlobsRef.current = [];
            remoteRecordedBlobsRef.current = [];
            recorderRef.current = null;
            remoteRecorderRef.current = null;

            if (mountedRef.current) {
                setCurrentVolume(0);
                setIsSessionActive(false);
                setStatus("");
                setMsgs([]);
                setMicOn(false);
                setIsPending(false);
            }
        } catch (err) {
            console.error("stopSession error:", err);
        }
    };

    const setMicOnOff = (isOn: boolean) => {
        if (audioStreamRef.current) {
            setMicOn(isOn);
            const tracks = audioStreamRef.current.getAudioTracks();
            if (tracks.length > 0) {
                tracks[0].enabled = isOn;
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

    // ---- Return ----
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