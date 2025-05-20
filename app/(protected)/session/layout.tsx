"use client";
import { isUserInSession } from "@/actions/session";
import Loader from "@/components/suspend/loading";
import { SessionProvider, useSession } from "next-auth/react";
import { useRouter, usePathname} from "next/navigation";
import { Suspense, useEffect, useState } from "react";

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const [isLoading, setIsLoading] = useState(true);

	const session = await useSession();
	const user = session.data?.user;
	const router = useRouter();
	const pathname = usePathname();

	if (!user) {
		router.push("/auth/login");
		return null;
	}

	useEffect(() => {
		// check route if not /active"
		if (pathname === "/active") {
			setIsLoading(false);
			return;
		}

		isUserInSession(user.id || "").then((activeSession) => {
			if (activeSession) {
				router.push(`/session/active/${activeSession.id}`);
			} else {
				setIsLoading(false);
			}
		});
	}, []);

	return (
		!isLoading ? {children} : <Loader text="loading"/>
	);
}