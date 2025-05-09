import { useState, useEffect } from "react";

export const useDailyStreak = () => {
    const [streak, setStreak] = useState(0);
    const [weekProgress, setWeekProgress] = useState<boolean[]>(Array(7).fill(false));
    const [hasIncrementedToday, setHasIncrementedToday] = useState(false);

    useEffect(() => {
        const savedStreak = localStorage.getItem("dailyStreak");
        const savedWeekProgress = localStorage.getItem("weekProgress");
        const savedDay = localStorage.getItem("currentDay");

        if (savedStreak) {
            setStreak(parseInt(savedStreak, 10));
        }

        if (savedWeekProgress) {
            setWeekProgress(JSON.parse(savedWeekProgress));
        }

        if (savedDay) {
            const lastSavedDay = parseInt(savedDay, 10);
            if (lastSavedDay !== new Date().getDay()) {
                if (new Date().getDay() === 0) {
                    setWeekProgress(Array(7).fill(false));
                }
                setHasIncrementedToday(false);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("dailyStreak", streak.toString());
        localStorage.setItem("weekProgress", JSON.stringify(weekProgress));
        localStorage.setItem("currentDay", new Date().getDay().toString());
    }, [streak, weekProgress]);

    const handleIncrementStreak = () => {
        if (!hasIncrementedToday) {
            const today = new Date().getDay();
            if (!weekProgress[today]) {
                const updatedWeekProgress = [...weekProgress];
                updatedWeekProgress[today] = true;
                setWeekProgress(updatedWeekProgress);
                setStreak(streak + 1);
                setHasIncrementedToday(true);
            }
        }
    };

    return { streak, weekProgress, handleIncrementStreak };
};