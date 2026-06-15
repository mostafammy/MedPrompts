import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://medprompts.mostafayaser.earth'),
  title: "MedPrompt | Board-Exam Master Prompts",
  description: "Generate structured, board-exam ready medical prompts. One tap to copy into ChatGPT or Gemini.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} antialiased h-full dark:bg-zinc-950`}>
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans relative overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
