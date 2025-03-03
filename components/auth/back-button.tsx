"use client";


import { Button } from "@/components/ui/button";
import Link from "next/link";

interface BackButtonProps {
    href: string;
    label: string;
};

export const BackButton = ({ label, href }: BackButtonProps) => {
    return (
        <Button asChild size="sm" variant="link" className="font-normal w-full" onClick={() => console.log("Back button clicked")}>
            <Link href={href}>
                {label}
            </Link>
        </Button>
    )
};