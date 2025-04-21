"use client";

import { logout } from "@/actions/logout";
import { createSession } from "@/actions/session";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";

import { useRouter } from "next/navigation";

const CreateSessionPage = () => {

    const router = useRouter();
    const handleClick = async () => {
        router.push("/session/active/123");
    };

    return (
        <div className="flex flex-col w-full">
            <Button onClick={handleClick}>
                {/* <a href="/session/active/123">Create Session</a> */}
            </Button>
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