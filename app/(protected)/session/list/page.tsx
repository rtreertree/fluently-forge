"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Loader from "@/components/suspend/loading";
import { ListBox, ListBoxProps, SessionListItem } from "../../_components/session/list/session-list";
import { getSessionList } from "@/actions/session";

const SessionListPage = () => {
    const { data: session, status } = useSession();

    const [isLoading, setIsLoading] = useState(true);
    const [sessionList, setSessionList] = useState<SessionListItem[]>([]);

    useEffect(() => {
        if (status === "authenticated" && session?.user?.id) {
            getSessionList(session.user.id)
                .then((data) => {
                    console.log("Session List Data:", data);
                    setSessionList(data);
                    setIsLoading(false);
                })
                .catch((error) => {
                    console.error("Error fetching session list:", error);
                    setIsLoading(false);
                });
        }
    }, [status, session?.user?.id]);

    if (status === "loading" || isLoading) {
        return <Loader text="Loading session details" />;
    }

    return <ListBox data={sessionList} />;
};

export default SessionListPage;