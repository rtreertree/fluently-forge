"use client";

import { getSession } from "@/actions/session";
import SessionAgent from "@/app/(protected)/_components/session/session-agent";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { use, useEffect, useState } from "react";

import { sessions } from "@prisma/client";
import { SessionMonologue } from "../../_components/session/session-monologue";

export default function ActiveSession() {
    const [activeSession, setActiveSession] = useState<sessions | null>(null);
    const session = useSession();
    const searchParams = useSearchParams();
    const sessionIdParam = searchParams.get("id");
    if (!sessionIdParam) {
        return (
            <div className="flex h-full flex-col items-center justify-center">
                <h1 className="text-2xl font-bold">Session ID is required</h1>
            </div>
        );
    }

    useEffect(() => {
        const checkSession = async () => {
            setActiveSession(await getSession(sessionIdParam));
            if (!activeSession) {
                return (
                    <div className="flex h-full flex-col items-center justify-center">
                        <h1 className="text-2xl font-bold">Session ID is required</h1>
                    </div>
                );
            }

            if (activeSession.userId !== session.data?.user.id) {
                return (
                    <div className="flex h-full flex-col items-center justify-center">
                        <h1 className="text-2xl font-bold">You are not authorized to access this session</h1>
                    </div>
                );
            }
        };
        checkSession();
    }, []);

    if (!activeSession) {
        return (
            <div className="flex h-full flex-col items-center justify-center">
                <h1 className="text-2xl font-bold">Loading...</h1>
            </div>
        );
    }

    switch (activeSession.type) {
        case "MONOLOGUE":
            return (
                <div className="flex h-full flex-col items-center justify-center">
                    <SessionMonologue session={activeSession}/>
                </div>
            );
        case "SMALLTALK":
            return (
                <div className="flex h-full flex-col items-center justify-center">
                    <SessionAgent />
                </div>
            );
        default:
            return (
                <div className="flex h-full flex-col items-center justify-center">
                    <h1 className="text-2xl font-bold">Session type not supported</h1>
                </div>
            );
    }
};