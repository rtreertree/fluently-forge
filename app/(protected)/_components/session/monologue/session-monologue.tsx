import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { sessions } from "@prisma/client";
import RadialVolumeBars from "../session-radialbars";
import { Mic, MicOff, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import MonologueQuestionCard from "./monologue-questioncard";
import { Card } from "@/components/ui/card";

import { mergeAudioBlobsInParallel } from "@/lib/audio";
import { useEffect } from "react";
import { endSession, getSession } from "@/actions/session";
import { useRouter } from "next/router";

interface SessionMonologueProps {
    session: sessions;
}

export const SessionMonologue = ({ session }: SessionMonologueProps) => {
    const router = useRouter();
    const { isRecording, currentVolume, start, stop, isPaused, pause, resume, audioBlob } = useVoiceRecorder();
    const SVG_SIZE = 250;

    const bulletpoints = session.bulletPoints?.split("||") || [];

    // Save the audio blob to a file
    useEffect(() => {
        if (audioBlob) {
            (async () => {
                const wav = await mergeAudioBlobsInParallel([audioBlob]);
                // send record to server
                if (wav) {
                    console.log("Merged audio blob", wav);
                    const formData = new FormData();
                    formData.append("user-audio", wav, "user-audio.wav");
                    formData.append("session-id", session.id);
                    formData.append("user-id", session.userId);
                    const res = await fetch("/api/session/upload-audio-mono", {
                        method: "POST",
                        body: formData,
                        headers: {
                            Authorization: `Bearer ${session.userId}`,
                        },
                    });
                    await endSession(session.id);
                    if (res.ok) {
                        console.log("Audio uploaded successfully");
                        router.push("/session/list");
                    } else {
                        console.error("Error uploading audio", res.statusText);
                    }
                }
            })();
        }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [audioBlob]);


    if (!session.question) {
        return
    }

    const isStartable = async () => {
        const activeSession = await getSession(session.id);
        if (activeSession) {
            return activeSession.status === "ACTIVE";
        } else {
            return false;
        }
    }

    const micOnClick = async () => {
        if (isRecording) {
            if (isPaused) {
                resume();
            } else {
                pause();
            }
        } else {
            if (await isStartable()) {
                start();
            } else {
                alert("Session is not active");
            }
        }
    }

    const buttonClick = async () => {
        if (!isRecording) {
            if (await isStartable()) {
                start();
            } else {
                alert("Session is not active");
            }
            return;
        }
        stop();
    }



    return (
        <Card className="border text-center justify-items-center p-4 rounded-2xl w-[full]">
            <MonologueQuestionCard question={session.question} prompts={bulletpoints} />
            <div
                className="flex items-center justify-center relative"
                style={{ width: `${SVG_SIZE}px`, height: `${SVG_SIZE}px` }}
            >
                <button
                    type="button"
                    aria-label={
                        isPaused ? "Mute microphone" : "Unmute microphone"
                    }
                    onClick={micOnClick}
                    className="z-10 absolute"
                    style={{ background: "transparent", border: "none" }}
                >
                    {!isPaused && isRecording ? (
                        <Mic size={28} className="text-black dark:text-white" />
                    ) : (
                        <MicOff size={28} className="text-black dark:text-white" />
                    )}
                </button>
                <RadialVolumeBars volume={currentVolume} isActive={isRecording} />
                <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-primary-foreground dark:bg-primary blur-[120px]" />

            </div>
            <Button onClick={buttonClick}>
                {isRecording ? "End" : "Start"}
            </Button>
        </Card>
    )
};