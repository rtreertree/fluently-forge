export interface AssessedUtterance {
    offsetMilliseconds: number;
    durationMilliseconds: number;
    text: string;
    words: WordSegment[];
    locale: string;
    confidence: number;
    assessment: WordAssessment[];
}

export interface WordSegment {
    text: string;
    offsetMilliseconds: number;
    durationMilliseconds: number;
}

export interface WordAssessment {
    Word: string;
    Offset: number;
    Duration: number;
    PronunciationAssessment: PronunciationAssessment;
}

export interface PronunciationAssessment {
    AccuracyScore: number;
    ErrorType: string;
    Feedback: PronunciationFeedback;
}

export interface PronunciationFeedback {
    Prosody: Prosody;
}

export interface Prosody {
    Break: BreakFeedback;
    Intonation: IntonationFeedback;
}

export interface BreakFeedback {
    ErrorTypes: string[];
    BreakLength: number;
    UnexpectedBreak?: {
        Confidence: number;
    };
    MissingBreak?: {
        Confidence: number;
    };
}

export interface IntonationFeedback {
    ErrorTypes: string[];
    Monotone?: {
        SyllablePitchDeltaConfidence: number;
    };
}