"use client";

import * as z from 'zod';

import { CardWrapper } from "./card-wrapper";
import {  useForm } from "react-hook-form";
import { useState, useTransition } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";

import { Registerchema } from "@/schemas";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { FormError } from '@/components/form-error';
import { FormSuccess } from '@/components/form-success';
import { register } from '@/actions/register';
import { useRouter } from 'next/navigation';

export const RegisterForm = () => {
    const router = useRouter();

    const [error, setError] = useState<string | undefined>("");
    const [success, setSuccess] = useState<string | undefined>("");
    const [isPending, startTransition] = useTransition();
    const form = useForm<z.infer<typeof Registerchema>>({
        resolver: zodResolver(Registerchema),
        defaultValues: {
            "email": "",
            "password": "",
            "name": ""
        },
    });

    const onSubmit = (values: z.infer<typeof Registerchema>) => {
        setError("");
        setSuccess("");
        startTransition(() => {
            register(values)
                .then((data) => {
                    setError(data.error);
                    setSuccess(data.success);
                    if (data.success) {
                        router.push("/auth/login");
                    }
                });
        });
    };

    return (
        <CardWrapper
            headerLabel="Create an account"
            backButtonLabel="Already have an account?"
            backButtonHref="/auth/login "
            showSocial={true}
        >
            <Form {...form}> 
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                        <FormField control={form.control} name="name" render={({field}) => (
                            <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                    <Input {...field} type="name" placeholder="Enter your username" disabled={isPending}/>
                                </FormControl>
                                <FormMessage />
                             </FormItem>
                        )}/>
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
                    <FormError message={error}/>
                    <Button typeof='submit' className='w-full' size="lg" variant="default" disabled={isPending}>
                        <span className="select-none">Create an account</span>
                    </Button>
                </form>
            </Form>
        </CardWrapper>
    )
};