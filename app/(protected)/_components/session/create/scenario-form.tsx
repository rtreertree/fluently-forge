import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateScenarioPrompt, validateTopic } from "@/actions/openaiHandler";
import { useState, useTransition } from "react";
import { ExclamationTriangleIcon, CountdownTimerIcon } from '@radix-ui/react-icons';
import { createSession } from "@/actions/session";
import { useSession } from "next-auth/react";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";


const voices = ["Alloy", "Ash"];
const scenariochema = z.object({
    prompt: z.string().min(1, "Topic is required").max(80, "Your prompt must be less than 50 characters"),
    voice: z.enum(["Alloy", "Ash"]).default("Alloy"),
});

const ScenarioForm = () => {

    const [error, setError] = useState(false);
    const [sessionError, setSessionError] = useState("");
    const [checking, setChecking] = useState(false);

    const session = useSession();


    const form = useForm<z.infer<typeof scenariochema>>({
        resolver: zodResolver(scenariochema),
        defaultValues: {
            prompt: "",
            voice: "Alloy",
        },
    });

    async function onSubmit(values: z.infer<typeof scenariochema>) {
        console.log(values)
        setChecking(true);
        setError(false);
        const isValid = await validateTopic(values.prompt, "SCENARIO_CREATION");
        if (isValid) {
            createSession({
                instructions: values.prompt,
                voice: values.voice.toLowerCase(),
                type: "SCENARIO_CREATION",
                userId: session.data?.user?.id || "",
                topic: values.prompt,
            }).then((response) => {
                if (!response.errormessage || response.id) {
                    setError(false);
                    setChecking(false);
                    window.location.href = `/session/active?id=${response.id}`;
                } else {
                    setSessionError(response.errormessage);
                    setChecking(false);
                }
            });
        } else {
            console.log(await generateScenarioPrompt(values.prompt));
            setError(true);
            setChecking(false);
        }
    }


    return (
        <Form {...form}>
            <Separator className="mb-4" />
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {error && (() => {
                    return (<div className="bg-destructive/15 p-3 rounded-md text-destructive flex items-center gap-x-2 select-none">
                        <ExclamationTriangleIcon />
                        <p>This topic may associated with prohibited content</p>
                    </div>)
                })()}
                {sessionError && (() => {
                    return (<div className="bg-destructive/15 p-3 rounded-md text-destructive flex items-center gap-x-2 select-none">
                        <ExclamationTriangleIcon />
                        <p>{sessionError}</p>
                    </div>)
                })()}
                {checking && (() => {
                    return (<div className="bg-emerald-500/15 p-3 rounded-md text-emerald-500 flex items-center gap-x-2 select-none">
                        <CountdownTimerIcon />
                        <p>Checking if this topic is valid</p>
                    </div>)
                })()}
                <FormField
                    control={form.control}
                    name="prompt"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Prompt</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Enter your prompt" {...field}/>
                            </FormControl>
                            <FormDescription>
                                Create a small talk session with the AI. You can choose any topic you want.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />                                
                <FormField
                    control={form.control}
                    name="voice"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex items-center space-x-2 justify-between">
                                <FormLabel>Voice</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="w-[120px]">
                                            <SelectValue placeholder="Select a voice" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="w-[120px]">
                                        {voices.map((item) => (
                                            <SelectItem key={item} value={item}>
                                                {item}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <FormDescription>
                                Select your preferred voice for the AI. You can choose any voice you want.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={checking}>Start talk now!</Button>
            </form>
        </Form>
    );
}

export default ScenarioForm;