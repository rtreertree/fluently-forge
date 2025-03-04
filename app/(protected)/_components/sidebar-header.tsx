import { SidebarHeader } from "@/components/ui/sidebar";

export const SidebarDashboardHeader = () => {
    return (
        <SidebarHeader>
            <h1 className="text-3xl font-bold mx-2 mt-5 mb-0 select-none">Fluently</h1>
            <h1 className="text-3xl font-bold mx-2 mt-0 select-none">Forge</h1>
        </SidebarHeader>
    );
}