"use server";

import fetch from 'node-fetch';
import { logDB } from "@/data/logs";
import { LogType } from "@prisma/client";
import { db } from '@/lib/db';


export const createSession = async (voice: string, instructions?: string) => {
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
            voice: voice,
            modalities: ["text", "audio"],
            instructions: instructions || "You are an energetic speaking partner for B1–B2 students practicing speaking. The lesson topic is how science and technology help us learn. When the student speaks:\n1. Respond in a short, friendly way with a fun fact or comment about science and technology as learning tools.\n2. Then, quickly ask an easy, related question for the student to answer aloud.\n3. If the student makes a mistake, kindly and clearly correct them, then ask them to repeat the right answer.\n4. Keep your language easy, your tone lively, and your feedback or questions very short. Always encourage the student to keep speaking. after all, if you got this message '1 minute left, Try to wrap up the conversation. and end the conversation smoothly.' please wrap up and end the conversation smoothly.",
        }),
    });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error.message);
    }

    logDB(LogType.SESSION, `Session create with ID: ${data.id}`);

    await db.active_sessions.create({
        data: {
            userId: "user_id",
            createdAt: new Date(),
            token: "data.token",
        }
    });

    return data;
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