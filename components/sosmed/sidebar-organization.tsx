"use client";

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '../ui/sidebar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { ChevronsUpDown, PlusIcon, Settings } from 'lucide-react'
import { useUser } from '@/context/user-context'
import { Item, ItemActions, ItemContent, ItemDescription, ItemHeader, ItemMedia, ItemTitle } from '../ui/item'
import { useState } from 'react';
import SidebarOrgDialog from './sidebar-org-dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

function SidebarOrganization() {
  const { isMobile } = useSidebar();
  const { user, activeOrg, setActiveOrg, loading } = useUser();
  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);
  const router = useRouter();

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <Item className="p-0">
            <ItemHeader>
              <ItemTitle className="text-lg font-bold">
                Sosmed
              </ItemTitle>
            </ItemHeader>
          </Item>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Item className="p-0 w-full">
                  <ItemMedia >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage
                        src={activeOrg?.image_url ?? ""}
                        alt={activeOrg?.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="rounded-lg">
                        {activeOrg?.name?.charAt(0) || "O"}
                      </AvatarFallback>
                    </Avatar>
                  </ItemMedia>
                  <ItemContent className="gap-y-0">
                    <ItemTitle>
                      {activeOrg?.name || "Select Organization"}
                    </ItemTitle>
                    <ItemDescription>
                      {activeOrg
                        ? "Current workspace"
                        : "No workspace selected"}
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
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Organizations
              </DropdownMenuLabel>
              {user?.organizations?.map((org, index) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => setActiveOrg(org)}
                  className="gap-2 p-2"
                >
                  <Avatar className="h-6 w-6 rounded-md">
                    <AvatarImage
                      src={activeOrg?.image_url ?? ""}
                      alt={activeOrg?.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="rounded-md">
                      {activeOrg?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {org.name}
                  {activeOrg?.id === org.id && (
                    <Button
                      className="ml-auto p-1 h-6 w-6"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/organization/${org.id}`)
                      }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setShowCreateOrgDialog(true) }}>
                <Item className="p-0 gap-2">
                  <ItemActions className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                    <PlusIcon className="size-4" />
                  </ItemActions>
                  <ItemContent className="gap-y-0">
                    <ItemDescription>
                      Add organization
                    </ItemDescription>
                  </ItemContent>
                </Item>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu >
      <SidebarOrgDialog
        open={showCreateOrgDialog}
        onOpenChange={setShowCreateOrgDialog}
      />
    </>
  )
}

export default SidebarOrganization
