"use server";

import { db } from "@/lib/db";
import {getUserByEmail} from "@/data/user";
import  bcryptjs  from "bcryptjs";
import { Registerchema } from "@/schemas";
import * as z from "zod";

export const register = async (values: z.infer<typeof Registerchema>) => {
    const validatedField= Registerchema.safeParse(values);

    if (!validatedField.success) {
        return { error: "Invalid field" };
    }

    const { email, password, name } = validatedField.data;
    const hashedPassword = await bcryptjs.hash(password, 10);

    const existingUser = await getUserByEmail(email);

    if (existingUser && existingUser.password) {
        return { error: "User already exists!" };
    }

    if (existingUser && !existingUser.password) {
        await db.user.update({
            where: {
                email,
            },
            data: {
                password: hashedPassword,
            },
        });
        return { success: "Create linked account to Github profile" };
    }


    await db.user.create({
        data: {
            name,
            email,
            password: hashedPassword
        },
    });

    // TODO send verification email

    return { success: "User created!" };
};