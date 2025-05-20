"use server";

import { openaiClient } from "@/lib/openai";
import * as zod from "zod";
import { zodResponseFormat, zodTextFormat } from "openai/helpers/zod";
import { SessionType } from "@prisma/client";


export const validateTopic = async (topic: string, type: SessionType) => {
    const isValidZod = zod.object({
        isValidTopic: zod.boolean()
    });

    
    let prompt = "";
    if (type === "MONOLOGUE" || type === "SMALLTALK") {
        prompt = `You will be given a topic and you need to determine if it is a valid topic for a conversation. 
        With these criteria: 'is meaningful', 'is not a question', 'is not a command', 'is not a list of items', 'is not offensive', 'is not sexual related.`;
    }

    if (type === "SCENARIO_CREATION") {
        prompt = `You will be given a prompt and you need to determine if it is a valid statement for a scenario creation.
        With these criteria: 'is meaningful', 'is a situation or scenario','is not a question', 'is not a list of items', 'is not offensive', 'is not sexual related.`;
    }

    const completion = await openaiClient.beta.chat.completions.parse({
        model: "gpt-4.1",
        messages: [
            {
                role: "system",
                content: prompt
            },
            {
                role: "user",
                content: `Is "${topic}" a valid topic for a conversation? Answer with true or false.`
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

export const generateScenarioPrompt = async (topic: string) => {
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
                content: `You are an assistant that rewrites user-provided scenario prompts, making them clearer and more engaging for two-person, AI-powered voice call simulations.
                Always frame the scenario as a conversation between two people. Clearly state the roles: Person A is the human user, and Person B is you (the AI agent)
                in format: "Scenario: [your improved scenario text] Person A (user): [descriptions], Person B (You, AI agent): [descriptions]".
                Avoid using the words "You" or "Your" except when referring to the AI agent. 
                If the message doesn't provide the role you can make an assumtion whom role is. Do not alter the main intent, but make the scenario more lively and clear.`
            },
            {
                role: "user",
                content: `${topic}`
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