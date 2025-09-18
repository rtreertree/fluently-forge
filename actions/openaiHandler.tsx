"use server";

import { openaiClient } from "@/lib/openai";
import * as zod from "zod";
import { zodResponseFormat, zodTextFormat } from "openai/helpers/zod";
import { SessionType } from "@prisma/client";
import fs, { ReadStream } from "fs";
import { Uploadable } from "openai/uploads.mjs";
import { Readable } from "stream";
import { generateSenarioPromptPrompt, topicValidationPrompt } from "@/data/prompts";


export const validateTopic = async (topic: string, type: SessionType) => {
    const isValidZod = zod.object({
        isValidTopic: zod.boolean(),
    });

    console.log("Validating topic:", topic, "for type:", type);

    const completion = await openaiClient.beta.chat.completions.parse({
        model: "gpt-4.1",
        messages: [
            {
                role: "system",
                content: topicValidationPrompt(type)
            },
            {
                role: "user",
                content: `${topic}`
            }
        ],
        response_format: zodResponseFormat(isValidZod, "isValidTopic"),
    });

    const parsedResponse = isValidZod.safeParse(JSON.parse(completion.choices[0].message.content as string));
    if (!parsedResponse.success) {
        console.error("Error parsing response:", parsedResponse.error);
        return false;
    }

    const { isValidTopic } = parsedResponse.data;
    return isValidTopic;
};

export const generateScenarioPrompt = async (topic: string, aiRole: string, userRole: string) => {
    const scenarioZod = zod.object({
        scenario: zod.string(),
        person_a: zod.string(),
        person_b: zod.string(),
    });

    const completion = await openaiClient.responses.parse({
        model: "gpt-4.1",
        temperature: 1,
        input: [
            {
                role: "system",
                content:  generateSenarioPromptPrompt()
            },
            {
                role: "user",
                content: `Prompt is : "${topic}" - AI role is "${aiRole}" - User role is "${userRole}".`
            }
        ],
        text: {
            format: zodTextFormat(scenarioZod, "prompt"),
        },
    });

    const parsedResponse = completion.output_parsed;
    if (!parsedResponse) {
        throw new Error("Error parsing response");
    }

    return parsedResponse
}

export const getMonologueQuestion = async (topic: string) => {
    const questionZod = zod.object({
        question: zod.string(),
        bulletpoints: zod.array(zod.string())
    });

    const completion = await openaiClient.responses.parse({
        model: "gpt-4.1",
        input: [
            {
                role: "system",
                content: `You will be given a topic and you need to generate a question for a monologue in a friendly and engaging tone.
                The question should be short and easy to understand.
                The question should be open-ended and encourage a thoughtful response.
                The question should be related to the topic and should not be a yes or no question.
                You will also provide 3 bullet points that are related to the question and linked to each other, make it shortest as possible, consise as questions for those bullet points.
                Do not ask in-depth questions, just ask a question that is related to the topic.
                The question should be in the format of a question and the bullet points should be in the format of a list.`
            },
            {
                role: "user",
                content: `Generate a question for a monologue about "${topic}".`
            }
        ],
        text: {
            format: zodTextFormat(questionZod, "question"),
        },
    });

    const parsedResponse = completion.output_parsed;
    if (!parsedResponse) {
        throw new Error("Error parsing response");
    }
    return parsedResponse;
};
