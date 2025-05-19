
import type { Metadata } from "next";
import { cookies } from "next/headers"

import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { AppSidebar } from "./_components/sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SidebarBreadcrumb } from "./_components/sidebar-breadcrumb";


export const metadata: Metadata = {
	title: "Dashboard"
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const session = await auth();
	const cookieStore = await cookies()
	const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"

	return (
		<SessionProvider session={session}>
			<SidebarProvider defaultOpen={defaultOpen}>
				<AppSidebar />
				<SidebarInset className="overflow-hidden h-screen">
					<SidebarBreadcrumb />
					{children}
				</SidebarInset>
			</SidebarProvider>
		</SessionProvider>

	);
}