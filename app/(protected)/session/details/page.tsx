"use client";

import { startAssessment } from "@/actions/assessment";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import ChatBoxComponent from "../../_components/session/assessment/chatbox";

export default function SessionDetails() {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");

    useEffect( () => {
        if (!id) {
            window.location.href = "/session/create";
            return;
        }
        console.log("Fetching session details for ID:", id);
    }, [id]);

    console.log("Session ID:", id);

    const onClickTest = async () => {
        await startAssessment( "54b424ff-ac58-434d-96e5-5a3457ea03d2");
        console.log("Button clicked to view session details");
    }


    return (
        <div>
            {/* Create centered button */}
            <div className="flex justify-center mt-4">
                <button
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={onClickTest}
                >
                    View Session Details
                </button>
                <ChatBoxComponent />
            </div>
        </div>
    );
}