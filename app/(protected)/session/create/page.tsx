"use client";

import SessionCreateCard from "../../_components/session/session-create-card";

const CreateSessionPage = () => {

    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 p-5 min-h-screen">
            <SessionCreateCard itemIndex={0}/>
        </div>
    );
};

export default CreateSessionPage;