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
import { getMonologueQuestion, validateTopic } from "@/actions/openaiHandler";
import { useState } from "react";
import { ExclamationTriangleIcon, CountdownTimerIcon } from '@radix-ui/react-icons';
import { createMonologueSession } from "@/actions/session";
import { useSession } from "next-auth/react";
import { Separator } from "@/components/ui/separator";


const smallTalkSchema = z.object({
    topic: z.string().min(1, "Topic is required").max(50, "Topic must be less than 30 characters"),
});

const MonologueForm = () => {

    const [error, setError] = useState(false);
    const [sessionError, setSessionError] = useState("");
    const [checking, setChecking] = useState(false);

    const session = useSession();


    const form = useForm<z.infer<typeof smallTalkSchema>>({
        resolver: zodResolver(smallTalkSchema),
        defaultValues: {
            topic: "",
        },
    });

    async function onSubmit(values: z.infer<typeof smallTalkSchema>) {
        console.log(values)
        setChecking(true);
        setError(false);
        const isValid = await validateTopic(values.topic, "MONOLOGUE");
        if (isValid) {
            const sessionResponse = await createMonologueSession(values.topic, session.data?.user?.id || "");
            setChecking(false);
            if (sessionResponse.id) {
                window.location.href = `/session/active?id=${sessionResponse.id}`;
            }
        } else {
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
                    name="topic"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Topic</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter your interesting topic!" {...field} />
                            </FormControl>
                            <FormDescription>
                                Create a small talk session with the AI. You can choose any topic you want.
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

export default MonologueForm;