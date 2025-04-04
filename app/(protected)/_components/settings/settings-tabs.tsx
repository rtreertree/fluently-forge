"use client";

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import React from "react";
import { SettingsGeneral } from "./settings-general";
import { SettingsTabsContent } from "./settings-tabs-content";
import { SettingsAccount } from "./settings-account";

const SettingsTabs = () => {
    return (
        <div className="flex flex-col items-center justify-center w-full pt-10">
            <Tabs defaultValue="general" className="w-[600px]">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="account">Account</TabsTrigger>
                </TabsList>
                <SettingsTabsContent
                    value="general"
                    title="General"
                    description="Make changes to your settings here. Click save when you're done." >
                    <SettingsGeneral />
                </SettingsTabsContent>

                <SettingsTabsContent
                    value="account"
                    title="Account"
                    description="Make changes to your account here. Click save when you're done." >
                    <SettingsAccount />
                </SettingsTabsContent>
            </Tabs>
        </div>
    );
};

export default SettingsTabs;