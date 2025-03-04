"use client";

import { logout } from "@/actions/logout";
import { useCurrentUser } from "@/hooks/use-current-user";

const CreateSessionPage = () => {
    const user = useCurrentUser();

    return (
        <div className="flex flex-col w-full">
            <div className="h-[50%] w-full bg-slate-300 flex items-center justify-center">
                <div className="w-[60%] flex items-center justify-center">
                    {/* Scenario creation */}
                    <div className="w-[40px] bg-white h-[40px] m-7"></div>
                </div>
                <div className="w-[40%] flex items-center justify-center">
                    {/* Card setting */}
                    <div className="w-[40px] bg-white h-[40px] m-7"></div>
                </div>
            </div>
            <div className="h-[50%] w-full bg-slate-500 flex items-center justify-center flex-row">
                <div className="w-[40px] bg-white h-[40px] m-7"></div>
                <div className="w-[40px] bg-white h-[40px] m-7"></div>
                <div className="w-[40px] bg-white h-[40px] m-7"></div>
            </div>
        </div>
    );
};

export default CreateSessionPage;