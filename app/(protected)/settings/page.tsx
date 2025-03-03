"use client";

import { logout } from "@/actions/logout";
import { useCurrentUser } from "@/hooks/use-current-user";

const SettingsPage = () => {
    const user = useCurrentUser();

    return (
    <div>
        <button onClick={logout}>Sign out</button>
    </div>
    );
};

export default SettingsPage;