import type { Metadata } from "next";
import {
  Space_Grotesk,
  IM_Fell_English,
  JetBrains_Mono,
  Pirata_One,
} from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const fellEnglish = IM_Fell_English({
  variable: "--font-fell-english",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const pirataOne = Pirata_One({
  variable: "--font-pirata-one",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Settlers | Find the settlement money you're owed",
  description:
    "Settlers charts your inbox for purchases tied to open class-action settlements, verifies each match, and fills the claim forms. You only sign at the end.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${fellEnglish.variable} ${jetbrainsMono.variable} ${pirataOne.variable} antialiased bg-background text-foreground min-h-dvh`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
