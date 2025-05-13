import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { sessions } from "@prisma/client";
import RadialVolumeBars from "../session-radialbars";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import MonologueQuestionCard from "./monologue-questioncard";
import { Card } from "@/components/ui/card";
interface SessionMonologueProps {
    session: sessions;
}

export const SessionMonologue = ({ session }: SessionMonologueProps) => {
    const { isRecording, currentVolume, start, stop, isPaused, pause, resume } = useVoiceRecorder();
    const SVG_SIZE = 250;

    const bulletpoints = session.bulletPoints?.split("||") || [];

    if (!session.question) {
        return 
    }

    const micOnClick = () => {
        console.log("Mic clicked", isRecording, isPaused);
        if (isRecording) {
            if (isPaused) {
                resume();
            } else {
                pause();
            }
        } else {
            start();
        }
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
            <Button onClick={async () => {
                if (isRecording) {
                    stop();
                } else {
                    start();
                }
            }}>
                {isRecording ? "End" : "Start"}
            </Button>
        </Card>
    )
};