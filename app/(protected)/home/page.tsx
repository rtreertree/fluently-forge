"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    getDailyStreak,
    getWeeklyProgress,
    getTodaySessionTypeCounts,
} from "@/actions/steak";
import { Flame, Star } from "lucide-react";
import { useSession } from "next-auth/react";
import CerfBox from "../_components/cefr_lvl/cerf-box";
import Loader from "@/components/suspend/loading";

const daysShort = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const SESSION_TYPES = [
    { key: "SMALLTALK", label: "Smalltalk" },
    { key: "SCENARIO_CREATION", label: "Scenario" },
    { key: "VIDEO_CALL", label: "Video-Call" },
    { key: "MONOLOGUE", label: "Monologue" },
];

const DailyStreakPage = () => {
    const [dailyStreak, setDailyStreak] = useState(0);
    const [isPending, setIsPending] = useState(true);
    const router = useRouter();
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
        <div className="relative min-h-screen bg-white select-none">
            {/* Main Streak Section - Absolutely Centered */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
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
                        const today = new Date();
                        const todayICT = new Date(today.getTime() + 7 * 60 * 60 * 1000);
                        todayICT.setUTCHours(0, 0, 0, 0);
                        const isToday =
                            dateObj.toISOString().slice(0, 10) ===
                            todayICT.toISOString().slice(0, 10);
                        return (
                            <div
                                key={day.date}
                                className="flex flex-col items-center"
                                style={{ transform: `translateX(${offset}px)` }}
                            >
                                <div
                                    className={`w-16 h-16 flex items-center justify-center rounded-full text-2xl shadow transition-all ${day.active
                                            ? "bg-green-500 text-white"
                                            : "bg-gray-200 text-gray-400"
                                        }`}
                                >
                                    <Star size={30} className="inline-block" />
                                </div>
                                <span className="mt-2 text-base font-medium text-gray-600 flex items-center gap-1">
                                    {weekday}
                                    {day.active && isToday && (
                                        <span className="text-s text-orange-500 font-semibold ml-1">
                                            {dateObj.getDate().toString().padStart(2, "0")}/
                                            {(dateObj.getMonth() + 1).toString().padStart(2, "0")}
                                        </span>
                                    )}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Right-side Card for Today's Session Types */}
            <div className="absolute left-1/2 top-1/2 -translate-y-1/2 ml-[340px] w-[320px]">
                <div className="bg-white rounded-xl shadow p-5 border flex flex-col gap-3">
                    <div className="font-semibold text-gray-700 text-lg mb-2">
                        Today's Activity
                    </div>
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
            {/* left side — moved further left to avoid overlap */}
            <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -ml-[600px] w-[320px]">
                <CerfBox />
            </div>
        </div>
    ) : (
        <Loader text="loading" />
    );
};

export default DailyStreakPage;
