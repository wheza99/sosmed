"use client";

import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../ui/sidebar'
import { PlusIcon } from 'lucide-react'
import { useUser } from '@/context/user-context'
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

function SidebarProject() {
  const { accounts } = useUser();
  const router = useRouter();

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'x':
      case 'twitter':
        return '𝕏';
      case 'instagram':
        return '📸';
      case 'tiktok':
        return '🎵';
      case 'linkedin':
        return '💼';
      default:
        return '📱';
    }
  };

  return (
    <>
      <SidebarGroup>
        <Button onClick={() => { router.push("/") }}>
          <PlusIcon />
          New Project
        </Button>
      </SidebarGroup>

      {accounts.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>
            Accounts
          </SidebarGroupLabel>
          <SidebarMenu>
            {accounts.map((account) => (
              <SidebarMenuItem key={account.id}>
                <SidebarMenuButton onClick={() => { router.push(`/project/${account.id}`) }}>
                  <span className="text-lg">{getPlatformIcon(account.platform)}</span>
                  <span className="text-sm font-medium">@{account.username}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu >
        </SidebarGroup>
      )}
    </>
  )
}

export default SidebarProject
