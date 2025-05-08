import { db } from "@/lib/db";
import { LogType } from "@prisma/client";

export const logDB = async (type: LogType, action: string) => {
    // console.log(`[DB][${type}]: ${action}`);
    // const logs = await db.logs.create({
    //     data: {
    //         action: action,
    //         type: type
    //     }
    // });
    // return logs;
}
