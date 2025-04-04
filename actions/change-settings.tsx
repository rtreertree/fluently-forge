"use server";

import { z } from 'zod';
import { SettingsSchema } from "@/schemas";
import { getUserById } from '@/data/user';
import { db } from '@/lib/db';

export const changeSettings = async (userId: string, values: z.infer<typeof SettingsSchema>) => {
const validatedField = SettingsSchema.safeParse(values);
    if (!validatedField.success) {
        return { error: "Invalid field" };
    }

    const {name, english_level } = validatedField.data;
    try {
         await db.user.update({
                    where: {
                        id: userId,
                    },
                    data: {
                        name: name,
                        englishLevel: english_level,
                    },
                });

        return { success: `Settings changed` };

    } catch (error) {
        console.error("Error changing settings", error);
        return { error: "Something went wrong!" };
    }
    // You can also handle specific errors here if needed
};