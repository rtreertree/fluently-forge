"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Field, useForm } from "react-hook-form"
import { string, z } from "zod"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form"

import { Input } from "@/components/ui/input"
import { ResetPasswordSchema } from "@/schemas"
import { useState, useTransition } from "react"
import { changePassword } from "@/actions/change-password"
import { FormSuccess } from "@/components/form-success"
import { FormError } from "@/components/form-error"
import { useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"

export function PasswordField() {
    const [error, setError] = useState<string | undefined>("");
    const [success, setSuccess] = useState<string | undefined>("");
    const [isPending, startTransition] = useTransition();
    const searchParams = useSearchParams();

    const session = useSession();
    const userId = session.data?.user?.id || "";
    
    const form = useForm({
        resolver: zodResolver(ResetPasswordSchema),
        defaultValues: {
            password: "",
            newPassword: "",
        },
    })

    const onSubmit = (values: z.infer<typeof ResetPasswordSchema>) => {
        setError("");
        setSuccess("");

        startTransition(() => {
            changePassword(userId, values)
                .then((data) => {
                    setError(data.error);
                    setSuccess(data.success);
                });
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Current password</FormLabel>
                            <FormControl>
                                <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>New password</FormLabel>
                            <FormControl>
                                <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormSuccess message={success}/>   
                <FormError message={error}/>
                <Button type="submit" className="mt-4">Change password</Button>
            </form>
        </Form>
    )
}
