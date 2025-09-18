import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { generateScenarioPrompt, validateTopic } from "@/actions/openaiHandler";
import { useState } from "react";
import {
    ExclamationTriangleIcon,
    CountdownTimerIcon,
} from "@radix-ui/react-icons";
import { createSession } from "@/actions/session";
import { useSession } from "next-auth/react";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

const voices = ["Alloy", "Ash"];

const scenariochema = z.object({
    prompt: z
        .string()
        .min(1, "Topic is required")
        .max(50, "Your prompt must be less than 50 characters"),
    aiRole: z
        .string()
        .min(1, "AI role is required")
        .max(50, "AI role must be less than 50 characters"),
    userRole: z
        .string()
        .min(1, "Your role is required")
        .max(50, "Your role must be less than 50 characters"),
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
            aiRole: "",
            userRole: "",
            voice: "Alloy",
        },
    });

    async function onSubmit(values: z.infer<typeof scenariochema>) {
        try {
            setChecking(true);
            setError(false);

            const isValid = await validateTopic(`topic : "${values.prompt}", AI role: "${values.aiRole}", User role: "${values.userRole}"`, "SCENARIO_CREATION");
            if (isValid) {
                const response = await createSession({
                    instructions: values.prompt,
                    aiRole: values.aiRole,
                    userRole: values.userRole,
                    voice: values.voice.toLowerCase(),
                    type: "SCENARIO_CREATION",
                    userId: session.data?.user?.id || "",
                    topic: values.prompt,
                });

                if (!response.errormessage && response.id) {
                    window.location.href = `/session/active?id=${response.id}`;
                } else {
                    setSessionError(response.errormessage as string);
                }
            } else {
                console.log(await generateScenarioPrompt(values.prompt, values.aiRole, values.userRole));
                setError(true);
            }
        } catch (err) {
            setSessionError("Something went wrong. Please try again.");
        } finally {
            setChecking(false);
        }
    }

    return (
        <Form {...form}>
            <Separator className="mb-4" />
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Error / Status Messages */}
                {error && (
                    <div className="bg-destructive/15 p-3 rounded-md text-destructive flex items-center gap-x-2 select-none">
                        <ExclamationTriangleIcon />
                        <p>This topic may be associated with prohibited content</p>
                    </div>
                )}
                {sessionError && (
                    <div className="bg-destructive/15 p-3 rounded-md text-destructive flex items-center gap-x-2 select-none">
                        <ExclamationTriangleIcon />
                        <p>{sessionError}</p>
                    </div>
                )}
                {checking && (
                    <div className="bg-emerald-500/15 p-3 rounded-md text-emerald-500 flex items-center gap-x-2 select-none">
                        <CountdownTimerIcon />
                        <p>Checking if this topic is valid</p>
                    </div>
                )}

                {/* Prompt + Voice in two columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Prompt */}
                    <FormField
                        control={form.control}
                        name="prompt"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Prompt</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Enter your prompt" {...field} />
                                </FormControl>
                                <FormDescription>
                                    Create a small talk session with the AI. You can choose any topic you want.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Voice */}
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
                </div>

                {/* AI Role full width */}
                <FormField
                    control={form.control}
                    name="aiRole"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>AI Role</FormLabel>
                            <FormControl>
                                <Textarea placeholder="e.g. A friendly English teacher" {...field} />
                            </FormControl>
                            <FormDescription>
                                Define what role the AI should take in this conversation.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Your Role full width */}
                <FormField
                    control={form.control}
                    name="userRole"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Your Role</FormLabel>
                            <FormControl>
                                <Textarea placeholder="e.g. A university student" {...field} />
                            </FormControl>
                            <FormDescription>
                                Define your own role in this conversation scenario.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" className="w-full" disabled={checking}>
                    Start talk now!
                </Button>
            </form>
        </Form>
    );
};

export default ScenarioForm;