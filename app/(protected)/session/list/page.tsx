"use client";

// import { SessionMonologue } from "../../_components/session/monologue/session-monologue";
import Loader from "@/components/suspend/loading";
import { ListBox } from "../../_components/session/list/session-list";
import { useState } from "react";
import { useSession } from "next-auth/react";
import router from "next/router";


const SessionListPage = () => {
    const session = useSession();
    const [isLoading, setIsLoading] = useState(true);

    // Check if session is loading or not
    if (!session.data?.user) {
        router.push("/auth/login");
    }


    // Simulate loading data
    setTimeout(() => {
        setIsLoading(false);
    }, 1000);

    return (
        isLoading ? <Loader text={""} /> : <ListBox data={[]} />
    );
};

export default SessionListPage;