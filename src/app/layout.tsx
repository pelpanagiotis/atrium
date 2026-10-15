import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { cookies } from "next/headers";
import { Suspense } from "react";
import "./globals.css";

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Atrium",
  description: "Self-hosted workspace for native work and synchronized provider tasks.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Suspense>
          <ThemeClass />
        </Suspense>
        {children}
      </body>
    </html>
  );
}

async function ThemeClass() {
  const theme = (await cookies()).get("atrium_theme")?.value;
  if (theme === "dark") {
    return <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('dark')" }} />;
  }
  return null;
}
