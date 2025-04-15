"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Field, useForm } from "react-hook-form"
import { string, z } from "zod"

import { Button } from "@/components/ui/button"
import {
    Form,
} from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"

import { FieldType, SettingsFormField, fieldDetails } from "./settings-form-field"
import { useSession } from "next-auth/react"
import { SettingsSchema } from "@/schemas"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useState, useTransition } from "react"
import { useSearchParams } from "next/navigation"
import { FormSuccess } from "@/components/form-success"
import { FormError } from "@/components/form-error"
import { changeSettings } from "@/actions/change-settings"
import { urlToUrlWithoutFlightMarker } from "next/dist/client/components/router-reducer/fetch-server-response"
import { EnglishLevel } from "@prisma/client"


export function SettingsGeneral() {

    const user = useCurrentUser();
    const { data, update, status } = useSession();
    const [error, setError] = useState<string | undefined>("");
    const [success, setSuccess] = useState<string | undefined>("");
    const [isPending, startTransition] = useTransition();
    const searchParams = useSearchParams();

    const form = useForm<z.infer<typeof SettingsSchema>>({
        resolver: zodResolver(SettingsSchema),
        defaultValues: {
            name: user?.name || "",
            english_level: (user?.englishLevel || "B1") as EnglishLevel,
        },
    })

    const fields: fieldDetails[] = [
        {
            name: "name",
            label: "Name",
            description: "Enter your name.",
            type: FieldType.TEXT,
            value: user?.name || "",
            placeholder: "Enter your name",
        },
        {
            name: "english_level",
            label: "English level",
            description: "Select your English level.",
            type: FieldType.SELECT,
            value: user?.englishLevel || "B1",
            items: ["A1", "A2", "B1", "B2", "C1", "C2"],
            placeholder: "Select your level",
        },
    ]


    function onSubmit(formdata: z.infer<typeof SettingsSchema>) {
        setError("");
        setSuccess("");

        startTransition(() => {
            if (user?.englishLevel === formdata.english_level && user?.name === formdata.name) {
                setError("No changes made");
                setSuccess("");
            } else {
                changeSettings(user?.id || "", formdata)
                    .then((re) => {
                        setError(re.error);
                        if (re.success) {
                            update(
                                {
                                    ...data,
                                    user: {
                                        // ...data.user,
                                        name: formdata.name,
                                        englishLevel: formdata.english_level as EnglishLevel,
                                    }
                                }
                            ).then(() => {
                                setSuccess("Settings updated successfully");
                            }).catch((err) => {
                                setError("Failed to update settings");
                            });
                        }
                    });
            };
        });
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
                <div>
                    <h3 className="mb-4 text-lg font-medium">Account information</h3>
                    <div className="space-y-4">
                        {fields.map((field) => (
                            <SettingsFormField key={field.name} form={form.control} param={field} />
                        ))}
                    </div>
                </div>
                <FormSuccess message={success} />
                <FormError message={error} />
                <Button type="submit">Save</Button>
            </form>
        </Form>
    )
}
