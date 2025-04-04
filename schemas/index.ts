import * as z from 'zod';

export const LoginSchema = z.object({
    email: z.string().email({
        message: "Please enter a valid email address"
    }),
    password: z.string().min(1, {
        message: "Password is required" 
    })
});

export const Registerchema = z.object({
    email: z.string().email({
        message: "Please enter a valid email address"
    }),
    password: z.string().min(6, {
        message: "Minimum 6 characters required" 
    }),
    name: z.string().min(1, {
        message: "Name is required"
    })
});

export const ResetPasswordSchema = z.object({
    password: z.string().min(1, {
        message: "Password is required" 
    }),
    newPassword: z.string().min(6, {
        message: "Minimum 6 characters required" 
    }),
});

export const SettingsSchema = z.object({
    name: z.string().min(1, {
        message: "Name is required"
    }),
    english_level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"], {
        required_error: "English level is required",
        invalid_type_error: "English level is required",
    }),
});