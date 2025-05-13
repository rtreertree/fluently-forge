"use server";

import fetch from 'node-fetch';
import { openaiClient } from '@/lib/openai';
import { logDB } from "@/data/logs";
import { LogType, SessionType } from "@prisma/client";
import { db } from '@/lib/db';
import { getMonologueQuestion } from './openaiHandler';
import { v4 as uuid } from 'uuid';

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
    const isInSession = await isUserInSession(sessionSettings.userId);
    if (isInSession) {
        return {
            id: "",
            errormessage: "You are already in the session"
        };
    }

    const id = uuid();
    // Create the DB session first, synchronously (we must do this before returning)
    await db.sessions.create({
        data: {
            id: id,
            userId: sessionSettings.userId,
            createdAt: new Date(),
            token: "NULL",
            topic: sessionSettings.topic,
            type: sessionSettings.type,
        }
    });

    // background processing
    (async () => {
        const apikey = process.env.OPENAI_API_KEY;
        const model = process.env.OPENAI_MODEL || "gpt-4o-mini-realtime-preview";
        try {
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

            if (!data || !data.client_secret || !data.id) {
                await db.sessions.update({
                    where: { id: id },
                    data: {
                        status: "CANCELLED",
                        token: "NULL",
                    },
                });
            } else {
                console.log("Session created with ID:", data.id);
                await db.sessions.update({
                    where: { id: id },
                    data: {
                        status: "ACTIVE",
                        token: data.client_secret.value,
                    },
                });
            }
        } catch (err) {
            try {
                await db.sessions.update({
                    where: { id: id },
                    data: {
                        status: "CANCELLED",
                        token: "NULL",
                    },
                });
            } catch (e) { }
            console.error('Background OpenAI session error', err);
        }
    })();

    // Return immediately after DB session creation
    return {
        id: id
    };
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
    const timelimit = new Date(Date.now() - 5 * 60 * 1000);

    const [, activeSession] = await db.$transaction([
        db.sessions.updateMany({
            where: {
                userId,
                status: "ACTIVE",
                createdAt: { lt: timelimit },
            },
            data: {
                token: "NULL",
                status: "CANCELLED",
            },
        }),
        db.sessions.findFirst({
            where: {
                userId,
                status: "ACTIVE",
                createdAt: { gte: timelimit },
            },
        }),
    ]);

    return Boolean(activeSession);
};

export const endSession = async (sessionId: string) => {
    const session = await db.sessions.update({
        where: {
            id: sessionId,
        },
        data: {
            endedAt: new Date(),
            status: "COMPLETED",
            token: "NULL",
        }
    })
}

export const createMonologueSession = async (topic: string, userId: string): Promise<SessionResponse> => {
    // First, check if user already in session (sync as possible)
    const isInSession = await isUserInSession(userId);
    if (isInSession) {
        return {
            id: "",
            errormessage: "You are already in the session"
        };
    }

    const id = uuid();

    // Immediately create session in DB with placeholder values
    try {
        await db.sessions.create({
            data: {
                id: id,
                userId: userId,
                createdAt: new Date(),
                type: SessionType.MONOLOGUE,
                topic: topic,
                status: "PENDING",
            }
        });
    } catch (e) {
        return {
            id: "",
            errormessage: "Database error: Could not create session"
        };
    }

    // Background fetch OpenAI and update session
    (async () => {
        try {
            const question = await getMonologueQuestion(topic);
            if (!question) {
                await db.sessions.update({
                    where: { id: id },
                    data: {
                        status: "CANCELLED"
                    }
                });
                return;
            }
            await db.sessions.update({
                where: { id: id },
                data: {
                    question: question.question,
                    bulletPoints: question.bulletpoints.join("||"),
                    status: "ACTIVE"
                }
            });
        } catch (e) {
            try {
                await db.sessions.update({
                    where: { id: id },
                    data: { status: "CANCELLED" }
                });
            } catch { }
            console.error('Background OpenAI question fetch error', e);
        }
    })();

    return {
        id,
        errormessage: ""
    };
};

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