"use client";
import { useEffect, useState } from "react";
import {
getDailyStreak,
getWeeklyProgress,
getTodaySessionTypeCounts
} from "@/actions/steak";
import { Flame ,Star} from "lucide-react";
import { useSession } from "next-auth/react";
import Loader from "@/components/suspend/loading";

const daysShort = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const SESSION_TYPES = [
    { key: "SMALLTALK", label: "Smalltalk" },
    { key: "SCENARIO_CREATION", label: "Scenario" },
    { key: "DICTIONARY", label: "Dictionary" },
    { key: "MONOLOGUE", label: "Monologue" },
];

const DailyStreakPage = () => {
    const [dailyStreak, setDailyStreak] = useState(0);
    const [isPending, setIsPending] = useState(true);
    const session = useSession();
    const userId = session.data?.user.id || "";
    const [weekProgress, setWeekProgress] = useState<
        { date: string; active: boolean }[]
    >([]);
    const [todayCounts, setTodayCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        const fetchProgress = async () => {
            const streak = await getDailyStreak(userId);
            const week = await getWeeklyProgress(userId);
            const counts = await getTodaySessionTypeCounts(userId);
            setDailyStreak(streak);
            setWeekProgress(week);
            setTodayCounts(counts);
        };
        fetchProgress().then(() => {
            setIsPending(false);
        });
    }, [userId]);

    return !isPending ? (
        <div className="flex flex-row items-start min-h-screen bg-white pt-10 select-none">
            {/* Main Streak Section */}
            <div className="flex flex-col items-center flex-1">
                {/* Streak Number Top-Center */}
                <div className="flex flex-col items-center mb-10">
                    <span className="text-6xl font-extrabold text-orange-500 flex items-center gap-2">
                        <Flame size={48} className="inline-block" />
                        {dailyStreak}
                    </span>
                    <span className="text-xl font-semibold text-gray-700 mt-2 tracking-wide">
                        dailystreak
                    </span>
                </div>

                {/* Weekly Progress Circles */}
                <div className="flex flex-col items-center gap-2 mt-4">
                    {weekProgress.map((day, idx) => {
                        const curveOffsets = [-40, 18, -28, 32, -16, 24, -12];
                        const offset = curveOffsets[idx % curveOffsets.length];
                        const dateObj = new Date(day.date);
                        const weekday = daysShort[dateObj.getDay()];
                        return (
                            <div
                                key={day.date}
                                className="flex flex-col items-center"
                                style={{ transform: `translateX(${offset}px)` }}
                            >
                                <div
                                    className={`w-16 h-16 flex items-center justify-center rounded-full text-2xl shadow transition-all ${
                                        day.active
                                            ? "bg-green-500 text-white"
                                            : "bg-gray-200 text-gray-400"
                                    }`}
                                >
                                   <Star size={30} className="inline-block"/>
                                </div>
                                <span className="mt-2 text-base font-medium text-gray-600">{weekday}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Right-side Card for Today's Session Types */}
            <div className="w-[320px] ml-8 mt-2">
                <div className="bg-white rounded-xl shadow p-5 border flex flex-col gap-3">
                    <div className="font-semibold text-gray-700 text-lg mb-2">Today's Activity</div>
                    <div className="flex flex-col gap-3">
                        {SESSION_TYPES.map((type) => (
                            <div key={type.key} className="flex items-center justify-between">
                                <span className="text-gray-700 font-medium">{type.label}</span>
                                <span className="text-lg font-bold text-gray-800">
                                    {todayCounts[type.key] ?? 0}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    ) : (
        <Loader text="loading" />
    );
};

export default DailyStreakPage;