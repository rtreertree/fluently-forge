"use server";
import { db } from "@/lib/db";
import { time } from "console";
import { date } from "zod";
export interface DailyStreak {
    streak: number;
}

export const getDailyStreak = async (userId: string) => {
    // Fetch user's current streak start date
    const user = await db.user.findUnique({
        where: { id: userId },
        select: { streak: true },
    });

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
    // console.log(uniqueDates)
    // If user's streak is before the first activity, update it
    if (user?.streak) {
        const streakStart = new Date(user.streak);
        streakStart.setUTCHours(0, 0, 0, 0);
        if (streakStart.getTime() < uniqueDates[0].getTime()) {
            // Update streak to first activity date (or today, as you wish)
            await db.user.update({
                where: { id: userId },
                data: { streak: new Date() }, // set to today
            });
            return 0;
        }
    }

    // Filter out dates before the user's streak start date
    let filteredDates = uniqueDates;
    if (user?.streak) {
        const streakStart = new Date(user.streak);
        streakStart.setUTCHours(0, 0, 0, 0);
        filteredDates = uniqueDates.filter(
            (date) => date.getTime() >= streakStart.getTime()
        );
        // Add the streak start date if not present

        // Sort again to ensure order
        filteredDates.sort((a, b) => a.getTime() - b.getTime());
    }

    // Check for missing days (break in streak)
    for (let i = 1; i < filteredDates.length; i++) {
        const prev = filteredDates[i];
        const curr = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);;
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        if (diff > 1) {
            // Streak broken, update streak to latest activity date
            await db.user.update({
                where: { id: userId },
                data: { streak: curr }, // set to latest activity date
            });
            return 0;
        }
    }

    // All dates are consecutive from streak start
    return filteredDates.length;
};

export const getWeeklyProgress = async (userId: string) => {
    const now = new Date();
    // Find this week's Monday
    const monday = new Date(now);
    const day = monday.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // if Sunday, go back 6 days, else to Monday
    monday.setDate(monday.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    // Build week: Monday to Sunday (all in ICT)
    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        // Convert to ICT and normalize to 00:00
        const ict = new Date(d.getTime() + 7 * 60 * 60 * 1000);
        ict.setUTCHours(0, 0, 0, 0);
        weekDays.push(ict);
    }

    // Get all sessions for this week
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weeklySessions = await db.sessions.findMany({
        where: {
            userId: userId,
            createdAt: {
                gte: monday,
                lte: sunday,
            },
        },
        select: { createdAt: true },
    });

    // Normalize session dates to start of ICT day (UTC+7)
    const sessionDays = new Set(
        weeklySessions.map((s) => {
            const utc = new Date(s.createdAt);
            let ict = new Date(utc.getTime() + 7 * 60 * 60 * 1000);
            if (ict.getUTCHours() >= 24) {
                ict.setUTCDate(ict.getUTCDate() + 1);
                ict.setUTCHours(0, 0, 0, 0);
            } else {
                ict.setUTCHours(0, 0, 0, 0);
            }
            // Use YYYY-MM-DD string for comparison
            return ict.toISOString().slice(0, 10);
        })
    );

    // Build result for each day of the week
    const weekProgress = weekDays.map((date) => ({
        date: date.toISOString().slice(0, 10),
        active: sessionDays.has(date.toISOString().slice(0, 10)),
    }));

    return weekProgress;
};  

export const getTodaySessionTypeCounts = async (userId: string) => {
    // Get current date in ICT (UTC+7)
    const now = new Date();
    const ictNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    ictNow.setUTCHours(0, 0, 0, 0);

    // Start and end of today in ICT
    const ictStart = new Date(ictNow);
    const ictEnd = new Date(ictNow);
    ictEnd.setUTCHours(23, 59, 59, 999);

    // Convert ICT start/end back to UTC for DB query
    const utcStart = new Date(ictStart.getTime() - 7 * 60 * 60 * 1000);
    const utcEnd = new Date(ictEnd.getTime() - 7 * 60 * 60 * 1000);

    // Find all sessions for today
    const sessions = await db.sessions.findMany({
        where: {
            userId,
            createdAt: {
                gte: utcStart,
                lte: utcEnd,
            },
        },
        select: { type: true },
    });

    // Count by type
    const counts: Record<string, number> = {};
    sessions.forEach((s) => {
        counts[s.type] = (counts[s.type] || 0) + 1;
    });
    console.log("Today's session type counts:", counts);
    return counts;
};