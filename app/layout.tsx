import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import EditProviderWrapper from "./EditProviderWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InoLabium – Open Research & Innovation Network",
  description:
    "InoLabium is a public research network where experiments, validation, and innovation happen in the open.",
  openGraph: {
    title: "InoLabium – Open Research & Innovation Network",
    description:
      "InoLabium is a public research network where experiments, validation, and innovation happen in the open.",
  },
  twitter: {
    title: "InoLabium – Open Research & Innovation Network",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-100`}
      >
        <EditProviderWrapper>{children}</EditProviderWrapper>
      </body>
    </html>
  );
}
