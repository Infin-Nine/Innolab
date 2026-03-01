"use client";

import DesktopLayout from "./DesktopLayout";
import MobileLayout from "./MobileLayout";

type ResponsiveLayoutProps = {
  activeTab: "feed" | "profile";
  onTabChange: (tab: "feed" | "profile") => void;
  hasSession: boolean;
  onOpenAuthConsole: () => void;
  fabMenuOpen: boolean;
  onFabOpen: () => void;
  onFabClose: () => void;
  desktopChildren: React.ReactNode;
  mobileChildren: React.ReactNode;
};

export default function ResponsiveLayout({
  activeTab,
  onTabChange,
  hasSession,
  onOpenAuthConsole,
  fabMenuOpen,
  onFabOpen,
  onFabClose,
  desktopChildren,
  mobileChildren,
}: ResponsiveLayoutProps) {
  return (
    <>
      <div className="block md:hidden">
        <MobileLayout
          activeTab={activeTab}
          onTabChange={onTabChange}
          fabMenuOpen={fabMenuOpen}
          onFabOpen={onFabOpen}
          onFabClose={onFabClose}
        >
          {mobileChildren}
        </MobileLayout>
      </div>

      <div className="hidden md:block">
        <DesktopLayout
          activeTab={activeTab}
          onTabChange={onTabChange}
          hasSession={hasSession}
          onOpenAuthConsole={onOpenAuthConsole}
        >
          {desktopChildren}
        </DesktopLayout>
      </div>
    </>
  );
}
