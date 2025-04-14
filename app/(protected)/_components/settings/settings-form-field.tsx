import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
} from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { boolean, map, z } from "zod"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"


export const enum FieldType {
    TEXT = "text",
    EMAIL = "email",
    PASSWORD = "password",
    SELECT = "select",
    SWITCH = "switch",
}

export interface fieldDetails {
    name: string
    label: string
    description?: string
    disabled?: boolean
    ariaReadonly?: boolean
    type: FieldType
    placeholder: string
    value: string | boolean
    items?: string[]
    hideLabel?: boolean 
}

export interface SettingsFormFieldProps {
    form: any // Replace with the correct type for your form
    param: fieldDetails
}


export const SettingsFormField = ({ form, param }: SettingsFormFieldProps) => {
    return (
        <FormField
            control={form.control}
            name={param.name}
            render={({ field }) => (
                <FormControl>
                    <FormItem className="flex flex-row items-center justify-between rounded-lg p-3 shadow-sm border"> {/*shadow-sm border*/}
                        {!param.hideLabel ? (
                            <div className="space-y-0.5">
                                <FormLabel>{param.label}</FormLabel>
                                <FormDescription>{param.description}</FormDescription>
                            </div>
                        ) : null}
                        
                        {param.type === FieldType.SWITCH && (typeof param.value === "boolean") ? (
                            <Switch
                                disabled={param.disabled}
                                aria-readonly={param.ariaReadonly}
                                defaultChecked={param.value}
                            />
                        ) : null}
                        {param.type === FieldType.SELECT && param.items ? (
                            <Select disabled={param.disabled || field.disabled} onValueChange={field.onChange} defaultValue={param.value as string}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue placeholder={param.placeholder} />
                                </SelectTrigger>
                                <SelectContent className="w-[120px]">
                                    <SelectGroup>
                                        {param.items.map((item) => (
                                            <SelectItem key={item} value={item}>
                                                {item}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        ) : null}
                        {param.type === FieldType.TEXT ? (
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Input type="text" id={param.name} onChange={field.onChange} placeholder={param.placeholder} defaultValue={param.value as string}/>
                            </div>
                        ) : null}
                    </FormItem>
                </FormControl>
            )}
        />
    )
}