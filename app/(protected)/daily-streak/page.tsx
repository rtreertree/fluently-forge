"use client";

import { useDailyStreak } from "./usedailystreak";

const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const DailyStreakPage = () => {
    const { streak, weekProgress, handleIncrementStreak } = useDailyStreak();

    return (
        <div className="flex flex-col items-center justify-top min-h-screen bg-white p-6 select-none">
            <h1 className="text-4xl font-bold text-gray-800 mb-6">Daily Streak</h1>

            {/* Streak Counter */}
            <div className="flex flex-col items-center mb-8">
                <div className="text-7xl text-orange-500 mb-2">🔥</div>
                <h2 className="text-5xl font-bold text-gray-800">{streak}</h2>
                <p className="text-gray-600 text-lg">day streak!</p>
            </div>

            {/* Weekly Tracker */}
            <div className="flex items-center justify-center gap-4 bg-white shadow-lg rounded-lg p-6 mb-8">
                {daysOfWeek.map((day, index) => (
                    <div
                        key={index}
                        className={`w-16 h-16 flex items-center justify-center rounded-full text-lg font-bold ${
                            weekProgress[index]
                                ? "bg-green-500 text-white"
                                : "bg-gray-300 text-gray-600"
                        }`}
                    >
                        {day}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DailyStreakPage;