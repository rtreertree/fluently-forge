import { 
    SidebarFooter,
    SidebarMenu, 
    SidebarMenuItem, 
    SidebarMenuButton, 
} from "@/components/ui/sidebar";

import { User2, ChevronUp } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { logout } from "@/actions/logout";
import { useCurrentUser } from "@/hooks/use-current-user";

export const SidebarDashboardFooter = () => {
    const user = useCurrentUser();
    return (
        <SidebarFooter>
        <SidebarMenu className="mb-5">
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  	<User2 /> {user?.name}
                  	<ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              	</DropdownMenuTrigger>
              	<DropdownMenuContent
                	side="top"
                	className="w-[--radix-popper-anchor-width]"
              	>
					<DropdownMenuItem>
						<span>Account</span>
					</DropdownMenuItem>
					<DropdownMenuItem>
						<span>Billing</span>
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => logout()}>
						<span>Sign out</span>
					</DropdownMenuItem>
              	</DropdownMenuContent>
                <span className="text-sm text-gray-500 ml-3 select-none">{user?.email}</span>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    );
}