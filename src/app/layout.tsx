import "./globals.css";
import type { Metadata, Viewport } from "next";
import { TRPCReactProvider } from "@/trpc/react";

export const metadata: Metadata = {
  title: "Anime Bomber 💣",
  description:
    "An anime-themed online word-bomb party game. Type anime words containing the bomb's letters before it explodes!",
};

export const viewport: Viewport = {
  themeColor: "#090812",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
