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
    const video_sessions = await db.video_session.findMany({
        where: {
            OR: [
                { userId1: userId },
                { userId2: userId }
            ],
            status: "COMPLETED",
        },
        orderBy: { startedAt: "asc" },
        select: { startedAt: true },
    });

    // Combine sessions and video_sessions into one array of dates
    const allSessionDates = [
        ...sessions.map(s => ({ date: new Date(s.createdAt) })),
        ...video_sessions
            .filter(v => v.startedAt)
            .map(v => ({ date: new Date(v.startedAt as Date) }))
    ];

    if (!allSessionDates || allSessionDates.length === 0) {
        await db.user.update({
            where: { id: userId },
            data: { streak: new Date() },
        });
        return 0;
    }

    // --- Check if there is no session in the last 24 hours ---
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const hasRecentSession = allSessionDates.some(
        (s) => s.date > twentyFourHoursAgo
    );
    if (!hasRecentSession) {
        await db.user.update({
            where: { id: userId },
            data: { streak: new Date() },
        });
        return 0;
    }
    // --- END NEW LOGIC ---

    // Convert all session dates to start-of-day in ICT (UTC+7)
    const sessionDates = [
        // sessions.createdAt is UTC, convert to ICT and normalize
        ...sessions.map((s) => {
            const utc = s.createdAt;
            const ictTime = new Date(utc.getTime() + 7 * 60 * 60 * 1000);
            ictTime.setUTCHours(0, 0, 0, 0);
            return ictTime;
        }),
        // video_sessions.startedAt is already ICT, just normalize to start of day
        ...video_sessions
            .filter(v => v.startedAt)
            .map(v => {
                const utc = new Date(v.startedAt as Date);
                utc.setUTCHours(0, 0, 0, 0);
                return utc;
            })
    ];
    console.log("session", sessions)
    console.log("video", video_sessions)
    console.log("All Session Dates:", allSessionDates);
    console.log("Session Dates:", sessionDates);
    // Remove duplicate days (only one session per day counts)
    const uniqueDates = Array.from(
        new Set(sessionDates.map((d) => d.getTime()))
    ).map((t) => new Date(t));

    // Sort chronologically
    uniqueDates.sort((a, b) => a.getTime() - b.getTime());

    // If user's streak is before the first activity, update it
    if (user?.streak) {
        const streakStart = new Date(user.streak);
        streakStart.setUTCHours(0, 0, 0, 0);
        if (streakStart.getTime() < uniqueDates[0].getTime()) {
            await db.user.update({
                where: { id: userId },
                data: { streak: new Date() },
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
        filteredDates.sort((a, b) => a.getTime() - b.getTime());
    }

    // Check for missing days (break in streak)
    for (let i = 1; i < filteredDates.length; i++) {
        const prev = filteredDates[i - 1];
        const curr = filteredDates[i];
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        if (diff > 1) {
            await db.user.update({
                where: { id: userId },
                data: { streak: curr },
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

    // Fetch both session types
    const sessions = await db.sessions.findMany({
        where: {
            userId: userId,
            createdAt: {
                gte: monday,
                lte: sunday,
            },
        },
        select: { createdAt: true },
    });

    const video_sessions = await db.video_session.findMany({
        where: {
            OR: [
                { userId1: userId },
                { userId2: userId }
            ],
            status: "COMPLETED",
            startedAt: {
                gte: monday,
                lte: sunday,
            },
        },
        select: { startedAt: true },
    });

    // Normalize all session dates to start of ICT day (UTC+7)
    const allSessionDates = [
        ...sessions.map((s) => {
            const utc = new Date(s.createdAt);
            const ict = new Date(utc.getTime() + 7 * 60 * 60 * 1000);
            ict.setUTCHours(0, 0, 0, 0);
            return ict.toISOString().slice(0, 10);
        }),
        ...video_sessions
            .filter(v => v.startedAt)
            .map((v) => {
                const ict = new Date(v.startedAt as Date);
                ict.setHours(0, 0, 0, 0);
                // Convert to ISO string and take date part
                return new Date(ict.getTime() - ict.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 10);
            }),
    ];

    const sessionDays = new Set(allSessionDates);

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
    const video_sessions = await db.video_session.findMany({
        where: {
            OR: [
                { userId1: userId },
                { userId2: userId }
            ],
            status: "COMPLETED",
            startedAt: {
                gte: utcStart,
                lte: utcEnd,
            },
        }
    });
    // Count by type
    const counts: Record<string, number> = {};
    sessions.forEach((s) => {
        counts[s.type] = (counts[s.type] || 0) + 1;
    });
    counts["VIDEO_CALL"] = video_sessions.length;
    return counts;
};