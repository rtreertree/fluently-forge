import {
	SidebarFooter,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuButton,
	useSidebar,
} from "@/components/ui/sidebar";

import { User2, BadgeCheck, LogOut, Sparkles, ChevronsUpDown, User } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { logout } from "@/actions/logout";
import { useCurrentUser } from "@/hooks/use-current-user";

export const SidebarDashboardFooter = () => {
	const user = useCurrentUser();
	const { isMobile } = useSidebar()


	const handleLogout = async () => {
		await logout();
	}

	const handleAccount = () => {
		window.location.href = "/settings";
	}

	return <SidebarFooter>
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="flex items-center gap-2 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                                <User2 className="size-4" />
                            </div>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-semibold">{user?.name || "---"}</span>
								<span className="truncate text-xs">{user?.email || "---"}</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<User2 />
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">{user?.name || "---"}</span>
									<span className="truncate text-xs">{user?.email || "---"}</span>
								</div>
							</div>
						</DropdownMenuLabel>

						<DropdownMenuSeparator />

						<DropdownMenuGroup>
							<DropdownMenuItem>
								<Sparkles />
								Donate us!
							</DropdownMenuItem>
							<DropdownMenuItem onClick={handleAccount}>
								<BadgeCheck />
								Account
							</DropdownMenuItem>
						
							
						</DropdownMenuGroup>

						<DropdownMenuSeparator />

						<DropdownMenuItem onClick={handleLogout}>
							<LogOut />
							Log out
						</DropdownMenuItem>

					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	</SidebarFooter>
}