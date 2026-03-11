"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { useLoginModal } from "@/app/contexts/LoginModalContext";
import ResponsiveLayout from "./ResponsiveLayout";

type NavItem = "problems" | "solutions" | "profile" | "collaborations";

type DashboardLayoutProps = {
  activeItem: NavItem;
  children: React.ReactNode;
};

export default function DashboardLayout({ activeItem, children }: DashboardLayoutProps) {
  const { session } = useAuth();
  const { openLoginModal } = useLoginModal();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#0f172a,_#020617_55%)] text-slate-100">
      <ResponsiveLayout
        activeItem={activeItem}
        hasSession={!!session}
        onOpenAuthConsole={() => openLoginModal()}
      >
        {children}
      </ResponsiveLayout>
    </div>
  );
}
