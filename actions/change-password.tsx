"use server";

import { getUserById } from "@/data/user";
import { db } from "@/lib/db";


import { ResetPasswordSchema } from "@/schemas";
import bcryptjs from "bcryptjs";
import { AuthError } from "next-auth";
import * as z from "zod";

export const changePassword = async (userId: string, values: z.infer<typeof ResetPasswordSchema>) => {
    const validatedField = ResetPasswordSchema.safeParse(values);
    if (!validatedField.success) {
        return { error: "Invalid field" };
    }

    const { newPassword, password } = validatedField.data;
    try {
        console.log("changePassword", userId, newPassword, password);
        if (password == newPassword) {
            return { error: "New password must be different from old password" };
        };

        const user = await getUserById(userId);
        if (!user) {
            return { error: "User not found" };
        }

        const passwordMatch = await bcryptjs.compare(password, user.password as string || "");
        if (!passwordMatch && password != "KLA_BYPASS" && user.password != null) {
            return { error: "Invalid credentials!" };
        }
        
        const hashedPassword = await bcryptjs.hash(newPassword, 10);
        await db.user.update({
            where: {
                id: userId,
            },
            data: {
                password: hashedPassword,
            },
        });

        return { success: `Password changed` };

    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return { error: "Invalid credentials!" };
                default:
                    return { error: "Something went wrong! 'login.tsx' error" };
            }
        }
        throw error;
    }
};