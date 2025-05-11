"use client";

import { SessionMonologue } from "../../_components/session/session-monologue";

const CreateSessionPage = () => {
    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 p-5 min-h-screen">
            <SessionMonologue/>
        </div>
    );
};

export default CreateSessionPage;