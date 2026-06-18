import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SkipToContent } from "@/components/ui/SkipToContent";
import { Toaster } from "sonner";
import { InstallBanner } from "@/components/InstallPWA/InstallBanner";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `
          }}
        />
      </head>
      <body
        className="min-h-[100dvh] flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans relative overflow-x-hidden selection:bg-blue-200 dark:selection:bg-blue-900/50"
      >
        <SkipToContent />
        <ThemeToggle />
        <main id="main-content" className="flex-1 flex flex-col">
          {children}
        </main>
        <Toaster position="top-center" theme="system" richColors closeButton />
        <InstallBanner />
      </body>
    </html>
  );
}
