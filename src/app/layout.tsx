import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { AdSenseHead } from "@/components/AdSlot";

export const metadata: Metadata = {
  title: "DrawFlow — Sketch boards & schema diagrams",
  description:
    "An Excalidraw + Eraser.io style canvas. Free-hand drawings and database schema diagrams, all in your browser.",
    other: {
    "google-adsense-account": "ca-pub-3080137879942692",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-full bg-canvas text-ink">
          <AdSenseHead />
          <Navbar />
          <main className="min-h-[calc(100vh-56px)]">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
