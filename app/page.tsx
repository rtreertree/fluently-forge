import { Button } from "@/components/ui/button";
import { LoginButton } from "@/components/auth/login-button";

export default function Home() {
  	return (
		<main className="flex h-full flex-col items-center justify-center bg-slate-800">
			<div className="space-y-10 text-center">
				<h1 className="text-6xl font-bold text-accent">This is a home page</h1>
				<p className="text-3xl font-semi-bold text-accent p-7">Click this button to sign up to our services</p>
				<LoginButton>
					<Button className="space-y-20" size="lg">Sign In</Button>
				</LoginButton>
			</div>
		</main>
  	);
}
