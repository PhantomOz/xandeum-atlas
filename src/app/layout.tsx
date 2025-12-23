import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Xandeum pNode Atlas",
  description: "Live analytics for the Xandeum pNode storage network",
  metadataBase: new URL("https://xandeum.network"),
  openGraph: {
    title: "Xandeum pNode Atlas",
    description: "Monitor pNode health, releases, and capacity in real-time",
    type: "website",
  },
  icons: {
    icon: "/xandeum-logo.svg",
    shortcut: "/xandeum-logo.svg",
    apple: "/xandeum-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${grotesk.variable} ${jetbrains.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
