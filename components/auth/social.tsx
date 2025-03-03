"use client";

import { signIn } from "next-auth/react";

import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";

import { Button } from "@/components/ui/button";
import { DEFAULT_LOGIN_REDIRECT } from "@/routes";

export const Social = () => {
    const onClick = (provider: string) => {
        signIn(provider, { callbackUrl: DEFAULT_LOGIN_REDIRECT });
    };

    return (
        <div className="flex items-center justify-center space-x-2 w-full">
            <Button size="lg" variant="outline" className="w-full" onClick={() => onClick("github")}>
                <FaGithub />
                <span>Sign in with Github</span>
            </Button>
        </div>
    );
};