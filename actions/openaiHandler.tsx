"use server";

import { openaiClient } from "@/lib/openai";
import * as zod from "zod";
import { zodResponseFormat, zodTextFormat } from "openai/helpers/zod";

export const validateTopic = async (topic: string) => {

    const isValidZod = zod.object({
        isValidTopic: zod.boolean()
    });

    const completion = await openaiClient.beta.chat.completions.parse({
        model: "gpt-4.1",
        messages: [
            {
                role: "system",
                content: `You will be given a topic and you need to determine if it is a valid topic for a conversation. With these criteria: 'is meaningful', 'is not a question', 'is not a command', 'is not a list of items', 'is not offensive', 'is not sexual related.`
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
                You will also provide 3 bullet points that are related to the question and the topic in order to help the user to create a monologue.
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