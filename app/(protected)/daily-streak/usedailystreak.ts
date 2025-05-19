import { useState, useEffect } from "react";

export const useDailyStreak = () => {
    const [streak, setStreak] = useState(0);
    const [weekProgress, setWeekProgress] = useState<boolean[]>(Array(7).fill(false));
    const [hasIncrementedToday, setHasIncrementedToday] = useState(false);

    useEffect(() => {
        fetch("/api/daily-streak")
            .then(res => res.json())
            .then(data => {
                if (data) {
                    setStreak(data.streak || 0);
                    setWeekProgress(data.weekProgress || Array(7).fill(false));
                }
            });
    }, []);

    useEffect(() => {
        fetch("/api/daily-streak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ streak, weekProgress }),
        });
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