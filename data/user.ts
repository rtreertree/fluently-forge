import { db } from "@/lib/db";
import { LogType } from "@prisma/client";
import { logDB } from "@/data/logs";


export const getUserByEmail = async (email: string) => {
    try {
        const user = await db.user.findUnique({
            where: {
                email
            }
        });
        logDB(LogType.GET_PROFILE, `getUserByEmail("${email}")`);
        return user;
    }
    catch (error) {
        return null;
    }
}

export const getUserById = async (id: string) => {
    try {
        const user = await db.user.findUnique({
            where: {
                id
            }
        });
        logDB(LogType.GET_PROFILE, `getUserById("${id}")`);
        return user;
    }
    catch (error) {
        return null;
    }
}