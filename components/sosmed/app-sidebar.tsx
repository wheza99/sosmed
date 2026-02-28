import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar"
import SidebarOrganization from "./sidebar-organization"
import SidebarProject from "./sidebar-accounts"
import SidebarUser from "./sidebar-user"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarOrganization />
      </SidebarHeader>
      <SidebarContent>
        <SidebarProject />
      </SidebarContent>
      <SidebarFooter>
        <SidebarUser />
      </SidebarFooter>
    </Sidebar>
  )
}
