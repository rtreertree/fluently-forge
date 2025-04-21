"use client";

import { useCurrentUser } from "@/hooks/use-current-user";
import SettingsForm from "../_components/settings/settings-tabs";

const SettingsPage = () => {
    const user = useCurrentUser();
    return (
        <SettingsForm />
    );
};

export default SettingsPage;