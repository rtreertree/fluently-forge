"use client";

import { useParams } from "next/navigation";
import SessionAgent from "@/app/(protected)/_components/session/session-agent";

export default function ActiveSession(){
    const router = useParams();
    const { id } = router;

    return (
        <div className="flex h-full flex-col items-center justify-center">
                <SessionAgent />
        </div>
    );
};