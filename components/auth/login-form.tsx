"use client";

import * as z from 'zod';

import { CardWrapper } from "./card-wrapper";
import {  useForm } from "react-hook-form";
import { useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";

import { LoginSchema } from "@/schemas";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { FormError } from '@/components/form-error';
import { FormSuccess } from '@/components/form-success';
import { login } from '@/actions/login';

export const LoginForm = () => {
    const [error, setError] = useState<string | undefined>("");
    const [success, setSuccess] = useState<string | undefined>("");
    const [isPending, startTransition] = useTransition();

    const searchParams = useSearchParams();
    const urlError = searchParams.get("error") == "OAuthAccountNotLinked" ? "This email is already in use with email and password login" : ""; 

    const form = useForm<z.infer<typeof LoginSchema>>({
        resolver: zodResolver(LoginSchema),
        defaultValues: {
            "email": "",
            "password": ""
        },
    });

    const onSubmit = (values: z.infer<typeof LoginSchema>) => {
        setError("");
        setSuccess("");

        startTransition(() => {
            login(values)
            .then((data) => {
                    setError(data.error);
                    setSuccess(data.success);
            });
        });
    };

    return (
        <CardWrapper
            headerLabel="Welcome back!"
            backButtonLabel="Don't have an account?"
            backButtonHref="/auth/register"
            showSocial={true}
        >
            <Form {...form}> 
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                        <FormField control={form.control} name="email" render={({field}) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input {...field} type="email" placeholder="Enter your email address" disabled={isPending}/>
                                </FormControl>
                                <FormMessage />
                             </FormItem>
                        )}/>
                        <FormField control={form.control} name="password" render={({field}) => (
                            <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                    <Input {...field} type="password" placeholder="Enter your password" disabled={isPending}/>
                                </FormControl>
                                <FormMessage />
                             </FormItem>
                        )}/>
                    </div>
                    <FormSuccess message={success}/>   
                    <FormError message={error || urlError}/>
                    <Button typeof='submit' className='w-full' size="lg" variant="default" disabled={isPending}>
                        <span className="select-none">Sign In</span>
                    </Button>
                </form>
            </Form>
        </CardWrapper>
    )
};