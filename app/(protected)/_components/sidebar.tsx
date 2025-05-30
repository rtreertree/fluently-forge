"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Home, Calendar, PencilLine, List } from "lucide-react";
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
import { useSidebar } from "@/components/ui/sidebar";

type SidebarItem = {
    title: string;
    url: string;
    icon: React.ElementType;
    description: string;
};

export const AppSidebar = () => {
    const items: SidebarItem[] = [
        { title: "Home", url: "/home", icon: Home, description: "Go to your dashboard home." },
        { title: "Daily Streak", url: "/daily-streak", icon: Calendar, description: "Track your daily learning streak." },
        { title: "Create session", url: "/session/create", icon: PencilLine, description: "Start a new learning session." },
        { title: "Session list", url: "/session/list", icon: List, description: "View all your previous sessions." },
    ];

    const pathname = usePathname();
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";

    return (
        <Sidebar
            collapsible="icon"
            style={{
                height: "100vh",
                boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
                userSelect: "none",
            }}
        >
            <SidebarDashboardHeader />
            <Separator />
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item, idx) => {
                                const isActive = pathname === item.url;
                                // Only open if hovered and not collapsed
                                const isOpen = hoveredIndex === idx && !isCollapsed;
                                return (
                                    <li key={item.title} className="list-none p-0 m-0">
                                        <SidebarMenuItem>
                                            <SidebarMenuButton
                                                asChild
                                                variant={isActive ? "outline" : "default"}
                                                onMouseEnter={() => !isCollapsed && setHoveredIndex(idx)}
                                                onMouseLeave={() => setHoveredIndex(null)}
                                            >
                                                <Link href={item.url} aria-label={item.title} className="flex items-center gap-2">
                                                    <item.icon size={20} />
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                        <div
                                            className={`
                                                transition-all duration-300 ease-in-out
                                                overflow-hidden
                                                ${isOpen ? "max-h-24 opacity-100 my-1" : "max-h-0 opacity-0 my-0"}
                                            `}
                                            onMouseEnter={() => !isCollapsed && setHoveredIndex(idx)}
                                            onMouseLeave={() => setHoveredIndex(null)}
                                            style={{ willChange: "max-height, opacity" }}
                                        >
                                            <div className="bg-gray-100 text-gray-800 rounded-md px-6 py-2 text-sm shadow">
                                                {item.description}
                                            </div>
                                        </div>
                                    </li>
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