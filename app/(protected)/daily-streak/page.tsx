"use client";

import { logout } from "@/actions/logout";
import { useCurrentUser } from "@/hooks/use-current-user";

const DailyStreakPage = () => {
    const user = useCurrentUser();

    return (
    <div>
        DailyStreakPage
    </div>
    );
};

export default DailyStreakPage;