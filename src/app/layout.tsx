import type { Metadata } from "next";
import { Inter } from "next/font/google";
import PlausibleProvider from "next-plausible";
import type { ScriptProps } from "next/script";
import "./globals.css";
import OfflineBanner from "@/components/OfflineBanner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://medprompts.mostafayaser.earth'),
  title: "MedPrompt | Board-Exam Master Prompts",
  description: "Generate structured, board-exam ready medical prompts. One tap to copy into ChatGPT or Gemini.",
  openGraph: {
    title: "MedPrompt | Board-Exam Master Prompts",
    description: "Generate structured, board-exam ready medical prompts.",
    url: "https://medprompts.mostafayaser.earth",
    type: "website",
    siteName: "MedPrompt",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} antialiased h-full dark:bg-zinc-950`}>
      <head>
        <PlausibleProvider
          src="https://plausible.io/js/script.js"
          scriptProps={{
            "data-domain": "medprompts.mostafayaser.earth",
          } as ScriptProps}
        />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans relative overflow-x-hidden">
        {/* Ambient background glow */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none">
          <div className="absolute top-[-25%] left-[-20%] w-[70%] h-[60%] rounded-full bg-blue-400/10 blur-[130px] dark:bg-blue-500/5 dark:blur-[180px]" />
          <div className="absolute bottom-[-15%] right-[-15%] w-[80%] h-[70%] rounded-full bg-sky-400/10 blur-[150px] dark:bg-sky-500/5 dark:blur-[200px]" />
        </div>
        {children}
        <OfflineBanner />
      </body>
    </html>
  );
}
