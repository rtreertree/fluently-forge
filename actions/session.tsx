"use server";

import fetch from 'node-fetch';
import { openaiClient } from '@/lib/openai';
import { logDB } from "@/data/logs";
import { LogType, SessionType } from "@prisma/client";
import { db } from '@/lib/db';
import { getMonologueQuestion } from './openaiHandler';

export interface createSessionInterface {
    userId: string;
    voice: string;
    type: SessionType;
    instructions: string;
    topic: string;
};

interface SessionResponse {
    id: string;
    errormessage?: string;
}

export const createSession = async (sessionSettings: createSessionInterface): Promise<SessionResponse> => {

    // check if user is in session
    const isInSession = await isUserInSession(sessionSettings.userId);
    if (isInSession) {
        return {
            id: "",
            errormessage: "You are already in the session"
        }
    }

    const apikey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini-realtime-preview";
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apikey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: model,
            voice: sessionSettings.voice,
            modalities: ["text", "audio"],
            instructions: sessionSettings.instructions,
        }),
    });
    const data = await response.json();

    if (!response.ok) {
        return {
            id: "",
            errormessage: "Cannot create session due to OpenAI API error"
        }
    }

    logDB(LogType.SESSION, `Session create with ID: ${data.id}`);

    const session = await db.sessions.create({
        data: {
            userId: sessionSettings.userId,
            createdAt: new Date(),
            token: data.client_secret.value,
            type: sessionSettings.type,
            topic: sessionSettings.topic,
        }
    });

    return {
        id: session.id
    }
};

export const getSession = async (sessionId: string) => {
    const session = await db.sessions.findFirst({
        where: {
            id: sessionId,
        },
    })
    return session;
}

export const isUserInSession = async (userId: string) => {
    const sessions = await db.sessions.findMany({
        where: {
            userId: userId,
            ended: false,
        },
    })

    // check if session is expired
    if (sessions.length > 0) {
        for (const session of sessions) {
            const now = new Date();
            const sessionCreatedAt = new Date(session.createdAt);
            const sessionDuration = 60 * 60 * 1000; // 1 hour in milliseconds
            const sessionExpired = now.getTime() - sessionCreatedAt.getTime() > sessionDuration;
            if (sessionExpired) {
                await db.sessions.update({
                    where: {
                        id: session.id,
                    },
                    data: {
                        endedAt: new Date(),
                        ended: true,
                        token: "NULL",
                    }
                });
            }
        }

        // check if session is not expired
        const notExpiredSessions = await db.sessions.findMany({
            where: {
                userId: userId,
                ended: false,
            },
        })
        if (notExpiredSessions.length > 0) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }

}

export const endSession = async (sessionId: string) => {
    const session = await db.sessions.update({
        where: {
            id: sessionId,
        },
        data: {
            endedAt: new Date(),
            ended: true,
            token: "NULL",
        }
    })
}

export const createMonologueSession = async (topic: string, userId: string): Promise<SessionResponse> => {
    const isInSession = await isUserInSession(userId);
    if (isInSession) {
        return {
            id: "",
            errormessage: "You are already in the session"
        }
    }

    const question = await getMonologueQuestion(topic);
    if (!question) {
        return {
            id: "",
            errormessage: "Cannot create session due to OpenAI API error"
        }
    }

    const session = await db.sessions.create({
        data: {
            userId: userId,
            createdAt: new Date(),
            type: SessionType.MONOLOGUE,
            topic: topic,
            question: question.question,
            bulletPoints: question.bulletpoints.join("||"),
        }
    });
    return {
        id: session.id,
    }
}

export const offerSession = async (offerSDP: string, EPHEMERAL_KEY: string) => {
    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini-realtime-preview";

    const url = new URL(baseUrl);
    url.searchParams.append("model", model);

    const sdpResponse = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/sdp",
            Authorization: `Bearer ${EPHEMERAL_KEY}`,
        },
        body: offerSDP,
    });

    if (!sdpResponse.ok) {
        console.error("Error sending SDP offer:", sdpResponse.status);
        console.log("EPHEMERAL_KEY:", EPHEMERAL_KEY);
        throw new Error("Failed to send SDP offer to OpenAI");
    }

    return await sdpResponse.text();
};