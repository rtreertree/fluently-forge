import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { SettingsGeneral } from "./settings-general";

interface SettingsTabsContentProps {
    children: React.ReactNode;
    value: string;
    title: string;
    description: string;
}

export const SettingsTabsContent = ({ children, title, description, value }: SettingsTabsContentProps) => {
    return (
        <TabsContent value={value}>
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>
                        {description}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {children}
                </CardContent>
            </Card>
        </TabsContent>
    )
}