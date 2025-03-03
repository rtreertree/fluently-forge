
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { SideBar } from "@/components/dashboard/sidebar";
export const metadata: Metadata = {
	title: "Dashboard"
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {

    const session = await auth();

	return (
        <SessionProvider session={session}>
            <SideBar />
			{children}
        </SessionProvider>
	
	);
}