"use client";

import { logout } from "@/actions/logout";
import { useCurrentUser } from "@/hooks/use-current-user";

const HomePage = () => {
    const user = useCurrentUser();

    return (
    <div>
        Home
    </div>
    );
};

export default HomePage;