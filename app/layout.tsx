import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bastion | Investment Workspace",
  description: "Portfolio intelligence, investment research, and explicit valuation scenarios.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
