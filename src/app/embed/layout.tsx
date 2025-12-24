import type { Metadata } from "next";
import "@/app/globals.css";
import "./embed.css";

export const metadata: Metadata = {
  title: "Xandeum Atlas Embed",
  description: "Embeddable widgets for the Xandeum pNode Atlas",
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="relative min-h-full bg-transparent">
        <div id="atlas-embed-root" className="min-h-full bg-transparent text-white">
          {children}
        </div>
      </body>
    </html>
  );
}
