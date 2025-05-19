import OpenAI from "openai";

declare global {
    var openaiClient: OpenAI | undefined; //eslint-disable-line
}

export const openaiClient = globalThis.openaiClient || new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "",
});


if (process.env.NODE_ENV !== "production") {
    globalThis.openaiClient = openaiClient;
}