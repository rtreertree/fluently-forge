"use client";

import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { uploadFile } from "@/actions/fileHandler";
const DailyStreakPage = () => {
    const user = useCurrentUser();

    function onClick() {
        uploadFile();
    };

    return (
    <div>
        <Button onClick={onClick}>Test button</Button>
    </div>
    );
};

export default DailyStreakPage;