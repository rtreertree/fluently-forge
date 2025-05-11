import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { sessions } from "@prisma/client";
import { CircularWaveformVisualizer } from "./waveform";
import { CircularVisualizer, FrequencyVisualizer, WaveformVisualizer, useAudioContext} from 'react-audio-visualizer-pro';


interface SessionMonologueProps {
    session?: sessions;
}

export const SessionMonologue = ({ session }: SessionMonologueProps) => {
    const {} = useAudioContext();
    
    return (
        <>
        
        {/* NOT IMPLEMENTED YET */}
        </>

    )
};