"use client";

import * as React from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/prefabs/app-sidebar";
import { ThemeToggleButton } from "@/components/elements/theme-toggle-button";
import { SmartBreadcrumbs } from "@/components/prefabs/smart-breadcrumbs";
import { UserMenu } from "@/components/prefabs/user-menu";
import { Separator } from "@/components/ui/separator"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex min-h-svh flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger className="-ml-1" />
           <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
          <SmartBreadcrumbs
            rootLabel="Dashboard"
            hideOnRoot={true}      // hide breadcrumbs on "/"
            rootHasDropdown={false}  // no dropdown on the root crumb
          />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggleButton />
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
