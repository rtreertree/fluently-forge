"use server";
import { db } from "@/lib/db";
export interface DailyStreak {
    streak: number;
}

export const getDailyStreak = async (userId: string) => {
    // Get all sessions for the user, sorted by date ascending
    const sessions = await db.sessions.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
    });

    if (!sessions || sessions.length === 0) {
        // Optionally update streak date to today if no sessions
        await db.user.update({
            where: { id: userId },
            data: { streak: new Date() },
        });
        return 0;
    }

    // Convert sessions to start-of-day in ICT (UTC+7)
    const sessionDates = sessions.map((s) => {
        const utc = new Date(s.createdAt);
        // Convert to UTC+7 (ICT)
        const ictTime = new Date(utc.getTime() + 7 * 60 * 60 * 1000);
        // Normalize to start of the ICT day
        ictTime.setUTCHours(0, 0, 0, 0);
        return ictTime;
    });

    // Remove duplicate days (only one session per day counts)
    const uniqueDates = Array.from(
        new Set(sessionDates.map((d) => d.getTime()))
    ).map((t) => new Date(t));

    // Sort chronologically
    uniqueDates.sort((a, b) => a.getTime() - b.getTime());

    console.log(uniqueDates)

    // Check for missing days (break in streak)
    for (let i = 1; i < uniqueDates.length; i++) {
        const prev = uniqueDates[i - 1];
        const curr = uniqueDates[i];
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        if (diff > 1) {
            // Streak broken
            await db.user.update({
                where: { id: userId },
                data: { streak: new Date() }, // reset streak
            });
            return 0;
        }
    }

    // All dates are consecutive
    return uniqueDates.length;
};

export const getWeeklyProgress = async (userId: string) => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 60 * 60 * 24 * 7 * 1000);
    const weeklySessions = await db.sessions.findMany({
        where: {
            userId: userId,
            createdAt: {
                gte: sevenDaysAgo,
            },
        },
    });

    const daysOfWeek = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ];
    const weekProgress: { [key: string]: boolean } = {
        Sunday: false,
        Monday: false,
        Tuesday: false,
        Wednesday: false,
        Thursday: false,
        Friday: false,
        Saturday: false,
    };

    weeklySessions.forEach((session) => {
        const day = daysOfWeek[new Date(session.createdAt).getDay()];
        weekProgress[day] = true;
    });

    // If today is Sunday, reset all except Sunday to false
    if (now.getDay() === 0) {
        Object.keys(weekProgress).forEach((day) => {
            if (day !== "Sunday") {
                weekProgress[day] = false;
            }
        });
    }

    return weekProgress;
};
