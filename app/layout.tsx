import type { Metadata } from "next";
import "./globals.css";
import EditProviderWrapper from "./EditProviderWrapper";

export const metadata: Metadata = {
  title: "InoLabium - Open Research & Innovation Network",
  description:
    "InoLabium is a public research network where experiments, validation, and innovation happen in the open.",
  openGraph: {
    title: "InoLabium - Open Research & Innovation Network",
    description:
      "InoLabium is a public research network where experiments, validation, and innovation happen in the open.",
  },
  twitter: {
    title: "InoLabium - Open Research & Innovation Network",
    description:
      "InoLabium is a public research network where experiments, validation, and innovation happen in the open.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-slate-950 text-slate-100">
        <EditProviderWrapper>{children}</EditProviderWrapper>
      </body>
    </html>
  );
}
