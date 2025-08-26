"use server";

import { db } from "@/lib/db";
import { EnglishLevel } from "@prisma/client";

export async function saveCefrResult(userId: string, cefrLevel: EnglishLevel) {
  try {
   
      await db.user.update({
        where: { id: userId },
        data: {
          englishLevel: cefrLevel,
        },
      });
  } catch (error) {
    console.error("Error saving CEFR result:", error);
    return { success: false, error: "Failed to save CEFR result" };
  }
}
      