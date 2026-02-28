"use client";

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '../ui/sidebar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { BadgeCheck, ChevronsUpDown, CreditCard, Key, LogInIcon, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/user-context'
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '../ui/item'
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';

function SidebarUser() {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { user, loading, refreshUser } = useUser();

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (response.ok) {
        await refreshUser();
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  }

  if (loading) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {user
          ?
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Item className="p-0 w-full">
                  <ItemMedia>
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage
                        src={undefined}
                        alt={user?.name ?? undefined}
                      />
                      <AvatarFallback className="rounded-lg">
                        {user?.name?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </ItemMedia>
                  <ItemContent className="gap-y-0">
                    <ItemTitle>
                      {user?.name}
                    </ItemTitle>
                    <ItemDescription>
                      {user?.email}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </ItemActions>
                </Item>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <Item className="px-1 py-1.5">
                  <ItemMedia>
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage
                        src={undefined}
                        alt={user?.name ?? undefined}
                      />
                      <AvatarFallback className="rounded-lg">
                        {user?.name?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </ItemMedia>
                  <ItemContent className="gap-y-0">
                    <ItemTitle>
                      {user?.name}
                    </ItemTitle>
                    <ItemDescription>
                      {user?.email}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => router.push("/auth/account")}>
                  <BadgeCheck />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/payment/plan")}>
                  <CreditCard />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/auth/keys")}>
                  <Key />
                  API Keys
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          :
          <Button className="w-full gap-2" variant="outline" onClick={() => router.push("/auth/login")} >
            <LogInIcon />
            Login
          </Button>
        }
      </SidebarMenuItem>
    </SidebarMenu >
  )
}

export default SidebarUser
