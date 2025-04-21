"use client";

import { createSession, offerSession } from "@/actions/session";
import { useEffect, useState } from "react"

export interface SessionAIAgentProps {
    EPHEMERAL_KE: string
}

export const SessionAIAgent = () => {

    const [listening, setListening] = useState(false);

    useEffect(() => {
        let pc: RTCPeerConnection;
        let ms: MediaStream;
        const init = async () => {
            try {
                const tokenResponse = await createSession();
                const EPHEMERAL_KEY = await tokenResponse.client_secret.value as string;

                // prepare webRTC connection
                pc = new RTCPeerConnection();
                const audioE1 = document.createElement("audio");
                audioE1.setAttribute("autoplay", "true");
                pc.ontrack = (event) => {
                    audioE1.srcObject = event.streams[0];
                }

                ms = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: false
                });
                pc.addTrack(ms.getTracks()[0]);

                const dc = pc.createDataChannel("oai-events");
                dc.addEventListener("message", (event) => {
                    const response = JSON.parse(event.data);

                    if (response.type === "input_audio_buffer.speech_started") {
                        setListening(true);
                    }
                    if (response.type === "input_audio_buffer.speech_ended") {
                        setListening(false);
                    }
                });

                // send offer to OpenAI
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                const sdpResponse = await offerSession(offer.sdp as string, EPHEMERAL_KEY);

                const answer: RTCSessionDescriptionInit = {
                    type: "answer",
                    sdp: sdpResponse,
                };

                await pc.setRemoteDescription(answer);

                console.log("Session created successfully:", tokenResponse);

            } catch (error) {
                console.error("Error creating session:", error);
            }
        };
        console.log("SessionAIAgent component mounted");
        init();
        return () => {
            if (pc) pc.close();
            if (ms) ms.getTracks().forEach((track) => track.stop());
        };
    }, []);

    return (
        <>
            <div className=" h-10 bg-slate-500"></div>
        </>
    )
}