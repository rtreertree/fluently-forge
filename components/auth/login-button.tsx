"use client";

import { useRouter } from "next/navigation";

interface LoginButtonProps {
    children: React.ReactNode,
    mode?: "modal" | "redirect",
    asChild?: boolean,
}

export const LoginButton = ({ children, mode = "redirect", asChild = false }: LoginButtonProps) => {
    const router = useRouter();
    const onClick = () => {
        console.log("Login button clicked");
        if (mode === "modal") {
            // Open modal
        } else {
            router.push("/auth/login");
        }
    };
    
    return (
        <span className="cursor-pointer" onClick={onClick}>
            {children}
        </span>
    )
};