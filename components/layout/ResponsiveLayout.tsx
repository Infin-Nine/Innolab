"use client";

import DesktopLayout from "./DesktopLayout";
import MobileLayout from "./MobileLayout";

type NavItem = "problems" | "solutions" | "profile" | "collaborations";

type ResponsiveLayoutProps = {
  activeItem: NavItem;
  hasSession: boolean;
  onOpenAuthConsole: () => void;
  children: React.ReactNode;
};

export default function ResponsiveLayout({
  activeItem,
  hasSession,
  onOpenAuthConsole,
  children,
}: ResponsiveLayoutProps) {
  return (
    <>
      <div className="block md:hidden">
        <MobileLayout activeItem={activeItem} hasSession={hasSession} onOpenAuthConsole={onOpenAuthConsole}>
          {children}
        </MobileLayout>
      </div>

      <div className="hidden md:block">
        <DesktopLayout activeItem={activeItem} hasSession={hasSession} onOpenAuthConsole={onOpenAuthConsole}>
          {children}
        </DesktopLayout>
      </div>
    </>
  );
}
