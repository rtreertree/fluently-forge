"use client";

import { getSession } from "@/actions/session";
import SessionAgent from "@/app/(protected)/_components/session/session-agent";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { sessions } from "@prisma/client";
import { SessionMonologue } from "../../_components/session/monologue/session-monologue";
import Loader from "@/components/suspend/loading";

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 60000;

export default function ActiveSession() {
    const [activeSession, setActiveSession] = useState<sessions | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const sessionIdParam = searchParams.get("id");
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!sessionIdParam) {
            window.location.href = "/session/create";
            return;
        }

        let isMounted = true;

        const pollSession = async () => {
            const sessionData = await getSession(sessionIdParam as string);
            if (!isMounted) return;

            if (!sessionData || sessionData.status === "CANCELLED" || sessionData.status === "COMPLETED") {
                setLoading(false);
                setError("unavailable");
                if (timerRef.current) clearTimeout(timerRef.current);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                return;
            } else if (sessionData.status === "ACTIVE") {
                setActiveSession(sessionData);
                setLoading(false);
                setError(null);
                if (timerRef.current) clearTimeout(timerRef.current);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                return;
            } else {
                timerRef.current = setTimeout(pollSession, POLL_INTERVAL_MS);
            }
        };

        setLoading(true);
        setError(null);
        setActiveSession(null);

        pollSession();

        timeoutRef.current = setTimeout(() => {
            setLoading(false);
            setError("timeout");
        }, TIMEOUT_MS);

        return () => {
            isMounted = false;
            if (timerRef.current) clearTimeout(timerRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };

    }, [sessionIdParam]);

    if (loading) {
        return <Loader text="Loading session..." />;
    }

    if (error === "timeout" || error === "unavailable") {
        return (
            <div className="flex justify-center items-center h-screen">
                Session is unavailable
            </div>
        );
    }

    if (!activeSession) {
        return <Loader text="Loading session..." />;
    }

    return (
        <div className="flex flex-col md:flex-row justify-center gap-4 p-5">
            {activeSession.type === "MONOLOGUE" && <SessionMonologue session={activeSession} />}
            {activeSession.type === "SMALLTALK" && <SessionAgent session={activeSession} />}
            {activeSession.type === "SCENARIO_CREATION" && <SessionAgent session={activeSession} />}
        </div>
    );
}