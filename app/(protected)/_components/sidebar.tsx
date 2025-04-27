"use client";
import React from "react";
import Link from "next/link";
import { Home, Calendar, PencilLine } from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
} from "@/components/ui/sidebar";
import { SidebarDashboardHeader } from "./sidebar-header";
import { SidebarDashboardFooter } from "./sidebar-footer";
import { usePathname } from "next/navigation";
import { Separator } from "@radix-ui/react-separator";

type SidebarItem = {
    title: string;
    url: string;
    icon: React.ElementType;
};

export const AppSidebar = () => {
    const items: SidebarItem[] = [
        { title: "Home", url: "/home", icon: Home },
        { title: "Daily Streak", url: "/daily-streak", icon: Calendar },
        { title: "Create session", url: "/session/create", icon: PencilLine },
    ];

    const pathname = usePathname();

    if (pathname.includes("session/active")) {
        return null;
    }

    return (
        <Sidebar
            collapsible="icon"
            style={{
                // position: "",
                height: "100vh",
                boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
            }}
        >
            <SidebarDashboardHeader />
            <Separator />
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => {
                                const isActive = pathname === item.url;
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            variant={isActive ? "outline" : "default"}                                        >
                                            <Link href={item.url} aria-label={item.title} className="flex items-center gap-2">
                                                <item.icon size={20} />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarDashboardFooter />
        </Sidebar>
    );
};