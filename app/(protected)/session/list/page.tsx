"use client";

import SessionCreateCard from "../../_components/session/session-create-card";

const SessionListPage = () => {

    const items = [
        {  name: "Small Talk", description: "Practice your English speaking skills with our AI-powered conversation partner." },
        {  name: "Sennario Creation", description: "Create scenarios to practice your English in real-world situations." },
        { name: "Dictionary", description: "Learn new words and expand your vocabulary." },
        {  name: "Public Speaking", description: "Improve your public speaking skills with guided practice." },
    ];
    

    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 p-5 min-h-screen">
            <SessionCreateCard itemIndex={0}/>
            <SessionCreateCard itemIndex={1}/>
            <SessionCreateCard itemIndex={2}/>
            <SessionCreateCard itemIndex={3}/>
        </div>
    );
};

//
export default SessionListPage;