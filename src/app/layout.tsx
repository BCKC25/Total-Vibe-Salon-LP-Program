import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

// Sans for all functional UI (labels, buttons, data). Serif for the
// business name and reward moments only — see CLAUDE.md "Brand" section.
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const serif = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });

// Shows up as the browser tab title on every page.
export const metadata: Metadata = {
  title: "Total Vibe Salon | Loyalty Punch",
  description: "Loyalty punch card program for Total Vibe Salon.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
