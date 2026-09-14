"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ChannelProvider, useChannel } from "@/hooks/use-channel";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PresenceHeartbeat } from "@/components/presence/presence-heartbeat";
import { cn } from "@/lib/utils";

// Auth-gated dashboard shell. Extracted from the layout so the layout
// itself can stay a server component and export metadata (noindex) —
// client components can't export Next's metadata object.

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { activeChannel } = useChannel();
  const router = useRouter();
  const pathname = usePathname();

  const isEmail =
    activeChannel === "email" ||
    pathname?.startsWith("/email") ||
    (typeof window !== "undefined" && localStorage.getItem("fortline_active_channel") === "email");

  // Sidebar drawer state — only used on mobile. On lg+ the sidebar is
  // always visible and this stays at `false` (ignored by the component).
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              "h-8 w-8 animate-spin rounded-full border-2 border-t-transparent",
              isEmail ? "border-[#2B60DE]" : "border-primary"
            )}
          />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-[100dvh] min-h-0 overflow-hidden bg-background">
      {/* Reports this tab's online/away presence once we know a user is
          signed in. Headless — renders nothing. */}
      <PresenceHeartbeat />
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
        <Header onOpenSidebar={() => setSidebarOpen(true)} />
        {/* Thinner horizontal padding on mobile so cards have room to breathe;
            fluid layout that scales seamlessly to ultrawide displays. */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 2xl:p-8">{children}</main>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ChannelProvider>
        <DashboardShellInner>{children}</DashboardShellInner>
      </ChannelProvider>
    </AuthProvider>
  );
}
