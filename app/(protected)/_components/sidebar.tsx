"use client";

import { Home, Calendar, PencilLine, Settings } from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarMenu,
    SidebarGroupContent,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarGroupLabel,
    SidebarHeader
} from "@/components/ui/sidebar"
import { SidebarDashboardHeader } from "./sidebar-header";
import { SidebarDashboardFooter } from "./sidebar-footer";

import { usePathname } from "next/navigation";

export const AppSidebar = () => {
    const items = [
        {
            title: "Home",
            url: "/home",
            icon: Home,
        },
        {
            title: "Daily Streak",
            url: "/daily-streak",
            icon: Calendar,
        },
        {
            title: "Create session",
            url: "/session/create",
            icon: PencilLine,
        },
    ]
    const pathname = usePathname();
    if (!pathname.includes("session/active")) {
        return (
            <Sidebar collapsible="none" style={
                {
                    width: "min(15rem, 100%)",
                    height: "100vh",
                }
            }>
                <SidebarDashboardHeader />
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupLabel>dashboard</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {items.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild variant={pathname === item.url ? "outline" : "default"}>
                                            <a href={item.url}>
                                                <item.icon />
                                                <span>{item.title}</span>
                                            </a>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
                <SidebarDashboardFooter />
            </Sidebar>)
    } else {
        return <></>
    }
};