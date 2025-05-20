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
    console.log(uniqueDates)
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
        if (!filteredDates.some(date => date.getTime() === streakStart.getTime())) {
            filteredDates.unshift(streakStart);
        }
        // Sort again to ensure order
        filteredDates.sort((a, b) => a.getTime() - b.getTime());
    }

    // Check for missing days (break in streak)
    for (let i = 1; i < filteredDates.length; i++) {
        const prev = filteredDates[i - 1];
        const curr = filteredDates[i];
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
