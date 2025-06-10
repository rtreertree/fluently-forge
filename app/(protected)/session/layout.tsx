'use client';

import { isUserInSession } from "@/actions/session";
import Loader from "@/components/suspend/loading";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { data: session, status } = useSession();
	const router = useRouter();
	const pathname = usePathname();
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const checkSession = async () => {
			if (status === "loading") return; // wait for session to load

			if (!session?.user) {
				router.push("/auth/login");
				return;
			}

			if (pathname !== "/session/active") {
				const activeSession = await isUserInSession(session.user.id || "");
				if (activeSession) {
					router.push(`/session/active?id=${activeSession.id}`);
				} else {
					setIsLoading(false);
				}
			} else {
				setIsLoading(false);
			}
		};

		checkSession();
	}, [session, status, pathname, router]);

	if (isLoading || status === "loading") {
		return <Loader text="Loading..." />;
	}

	return <>{children}</>;
}