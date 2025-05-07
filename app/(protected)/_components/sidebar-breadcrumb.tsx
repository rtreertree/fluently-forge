"use client";

import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@radix-ui/react-separator";
import { usePathname } from "next/navigation";
import React from "react";


export const SidebarBreadcrumb = () => {
    const pathname = usePathname();
    const pathArray = pathname.split("/").filter((path) => path !== "");

    return (
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb className="select-none">
                    <BreadcrumbList>

                        <BreadcrumbItem className="hidden md:block">
                            <BreadcrumbPage>
                                Fluently Forge
                            </BreadcrumbPage>
                        </BreadcrumbItem>

                        {pathArray.map((item, idx) => (
                            <React.Fragment key={item || idx}>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>{item}</BreadcrumbPage>
                                </BreadcrumbItem>
                            </React.Fragment>
                        ))}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
        </header>
    )
};